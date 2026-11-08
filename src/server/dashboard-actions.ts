"use server";
/**
 * Every dashboard change. Each action checks the login first (spec §5.2), validates its input,
 * then refreshes the page. Changes that show on the website also expire the public cache.
 */
import { and, eq, gte, isNull, notExists } from "drizzle-orm";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { housePhotos, houses, inquiries, paymentClaims, payments, rentCharges, repairs, tenants, utilityBills } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isISODate } from "@/lib/dates";
import { INQUIRY_STATUSES, PAYMENT_METHODS, REPAIR_STATUSES, UTILITY_KINDS, UTILITY_PAYERS } from "@/lib/options";
import { HOUSE_STATUSES } from "@/lib/status";
import { deleteUpload, saveUpload } from "@/lib/storage";
import { linesToList, slugify } from "@/lib/text";
import { HOUSES_TAG } from "./public-data";
import { syncCharges, today } from "./dashboard-data";
import { getPaymentSettings, sendRentReminder, setSetting } from "./messenger";

export type FormState = { ok: boolean; error: string; at?: number };

// ---- field helpers ----
const text = (max = 200) => z.string().trim().max(max);
const required = (label: string, max = 200) => z.string().trim().min(1, `${label} is required.`).max(max);
const date = (label: string) => z.string().refine(isISODate, `${label}: pick a date.`);
const optionalDate = z.string().refine((v) => v === "" || isISODate(v), "Pick a valid date.").transform((v) => v || null);
const pesos = (label: string) => z.coerce.number({ error: `${label}: enter a number.` }).int(`${label}: whole pesos only.`).min(0, `${label} can't be negative.`).max(10_000_000);
const optionalPesos = z.string().trim().transform((v, ctx) => {
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) ctx.addIssue({ code: "custom", message: "Use whole pesos." });
  return n;
});

function parse<T extends z.ZodTypeAny>(schema: T, fd: FormData): { data: z.infer<T> } | { error: string } {
  const result = schema.safeParse(Object.fromEntries(fd));
  return result.success ? { data: result.data } : { error: result.error.issues[0]?.message ?? "Please check the form." };
}

const done = (publicChange = false): FormState => {
  if (publicChange) updateTag(HOUSES_TAG);
  refresh();
  return { ok: true, error: "", at: Date.now() };
};
// Refresh even on failure: a dashboard re-render without one hits a Next.js dev bug
// ("cookies object does not match"), because cookies stay in action mode.
const fail = (error: string): FormState => {
  refresh();
  return { ok: false, error };
};

// ---- houses ----
export async function setHouseStatus(houseId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const status = z.enum(HOUSE_STATUSES).safeParse(fd.get("status"));
  if (!status.success) return fail("Pick a status.");
  await db.update(houses).set({ status: status.data, updatedAt: new Date().toISOString().slice(0, 19).replace("T", " ") }).where(eq(houses.id, houseId));
  return done(true);
}

const listingSchema = z.object({
  name: required("Name", 80),
  type: text(80),
  publicLocation: required("Location shown on the website", 120),
  fullAddress: text(200),
  mapUrl: z.string().trim().max(500).refine((v) => v === "" || /^https:\/\//.test(v), "Map link must start with https://"),
  monthlyRent: pesos("Rent"),
  bedrooms: z.coerce.number({ error: "Bedrooms: enter a number." }).int().min(0).max(20),
  bathrooms: z.coerce.number({ error: "Bathrooms: enter a number." }).int().min(0).max(20),
  floorAreaSqm: optionalPesos,
  utilities: z.enum(["own", "shared"]),
  description: text(2000),
  features: text(2000),
  terms: text(300),
  isPublished: z.string().optional(),
});

export async function updateListing(houseId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const r = parse(listingSchema, fd);
  if ("error" in r) return fail(r.error);
  const { features, isPublished, ...rest } = r.data;
  await db
    .update(houses)
    .set({ ...rest, features: linesToList(features), isPublished: isPublished === "on" })
    .where(eq(houses.id, houseId));
  return done(true);
}

export async function createHouse(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const r = parse(z.object({ name: required("Name", 80), monthlyRent: pesos("Rent") }), fd);
  if ("error" in r) return fail(r.error);
  let slug = slugify(r.data.name) || "house";
  if ((await db.$count(houses, eq(houses.slug, slug))) > 0) slug = `${slug}-${Date.now().toString(36)}`;
  const [house] = await db
    .insert(houses)
    .values({ name: r.data.name, slug, monthlyRent: r.data.monthlyRent, publicLocation: "", isPublished: false, sortOrder: 99 })
    .returning({ id: houses.id });
  updateTag(HOUSES_TAG);
  redirect(`/dashboard/houses/${house.id}`);
}

// ---- photos ----
export async function uploadPhoto(houseId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a photo first.");
  let url: string;
  try {
    url = await saveUpload(file);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Upload failed.");
  }
  const [house] = await db.select({ name: houses.name }).from(houses).where(eq(houses.id, houseId));
  const count = await db.$count(housePhotos, eq(housePhotos.houseId, houseId));
  await db.insert(housePhotos).values({ houseId, url, alt: `${house?.name ?? "House"} photo ${count + 1}`, sortOrder: count });
  return done(true);
}

export async function deletePhoto(photoId: number): Promise<void> {
  await requireUser();
  const [photo] = await db.delete(housePhotos).where(eq(housePhotos.id, photoId)).returning();
  if (photo) await deleteUpload(photo.url);
  done(true);
}

export async function makeCover(photoId: number): Promise<void> {
  await requireUser();
  const [photo] = await db.select().from(housePhotos).where(eq(housePhotos.id, photoId));
  if (!photo) return;
  const all = await db.select().from(housePhotos).where(eq(housePhotos.houseId, photo.houseId));
  const ordered = [photo, ...all.filter((p) => p.id !== photoId).sort((a, b) => a.sortOrder - b.sortOrder)];
  for (const [i, p] of ordered.entries()) await db.update(housePhotos).set({ sortOrder: i }).where(eq(housePhotos.id, p.id));
  done(true);
}

// ---- tenants ----
const tenantSchema = z.object({
  fullName: required("Name", 100),
  phone: required("Mobile number", 30),
  email: text(120),
  moveInDate: date("Move-in date"),
  leaseEndDate: optionalDate,
  monthlyRent: pesos("Rent"),
  dueDay: z.coerce.number({ error: "Due day is 1 to 31." }).int().min(1, "Due day is 1 to 31.").max(31, "Due day is 1 to 31."),
  depositAmount: optionalPesos,
  notes: text(1000),
});

export async function addTenant(houseId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const r = parse(tenantSchema, fd);
  if ("error" in r) return fail(r.error);
  if (r.data.leaseEndDate && r.data.leaseEndDate <= r.data.moveInDate) return fail("Lease end must be after move-in.");
  const current = await db.$count(tenants, and(eq(tenants.houseId, houseId), isNull(tenants.movedOutDate)));
  if (current > 0) return fail("This house already has a tenant. Move them out first.");
  await db.insert(tenants).values({ houseId, ...r.data });
  await db.update(houses).set({ status: "occupied" }).where(eq(houses.id, houseId));
  await syncCharges();
  return done(true);
}

export async function updateTenant(tenantId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const r = parse(tenantSchema, fd);
  if ("error" in r) return fail(r.error);
  await db.update(tenants).set(r.data).where(eq(tenants.id, tenantId));
  await syncCharges();
  return done();
}

export async function moveOut(tenantId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const r = parse(z.object({ movedOutDate: date("Move-out date") }), fd);
  if ("error" in r) return fail(r.error);
  const [tenant] = await db.update(tenants).set({ movedOutDate: r.data.movedOutDate }).where(eq(tenants.id, tenantId)).returning();
  if (!tenant) return fail("Tenant not found.");
  // Drop unpaid charges due on/after move-out (they are no longer owed).
  await db
    .delete(rentCharges)
    .where(
      and(
        eq(rentCharges.tenantId, tenantId),
        gte(rentCharges.dueDate, r.data.movedOutDate),
        notExists(db.select().from(payments).where(eq(payments.chargeId, rentCharges.id))),
      ),
    );
  await db.update(houses).set({ status: "vacant" }).where(eq(houses.id, tenant.houseId));
  return done(true);
}

// ---- rent ----
export async function recordPayment(chargeId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const r = parse(
    z.object({
      amount: pesos("Amount").refine((n) => n > 0, "Amount must be more than ₱0."),
      paidOn: date("Paid on"),
      method: z.enum(PAYMENT_METHODS),
      reference: text(80),
      note: text(300),
    }),
    fd,
  );
  if ("error" in r) return fail(r.error);
  if (r.data.paidOn > today()) return fail("Paid-on date can't be in the future.");
  const [charge] = await db.select().from(rentCharges).where(eq(rentCharges.id, chargeId));
  if (!charge) return fail("Charge not found.");
  await db.insert(payments).values({ chargeId, tenantId: charge.tenantId, houseId: charge.houseId, ...r.data });
  return done();
}

export async function deletePayment(paymentId: number): Promise<void> {
  await requireUser();
  await db.delete(payments).where(eq(payments.id, paymentId));
  done();
}

// ---- utility bills ----
export async function addBill(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const r = parse(
    z.object({
      houseId: z.coerce.number({ error: "Pick a house." }).int().positive("Pick a house."),
      kind: z.enum(UTILITY_KINDS),
      period: z.string().regex(/^\d{4}-\d{2}$/, "Pick the billing month."),
      amount: pesos("Amount"),
      dueDate: date("Due date"),
      cutoffDate: optionalDate,
      paidBy: z.enum(UTILITY_PAYERS),
      note: text(300),
    }),
    fd,
  );
  if ("error" in r) return fail(r.error);
  await db.insert(utilityBills).values(r.data);
  return done();
}

export async function markBillPaid(billId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const r = parse(z.object({ paidOn: date("Paid on") }), fd);
  if ("error" in r) return fail(r.error);
  await db.update(utilityBills).set({ paidOn: r.data.paidOn }).where(eq(utilityBills.id, billId));
  return done();
}

export async function deleteBill(billId: number): Promise<void> {
  await requireUser();
  await db.delete(utilityBills).where(eq(utilityBills.id, billId));
  done();
}

// ---- repairs ----
export async function addRepair(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const r = parse(
    z.object({
      houseId: z.coerce.number({ error: "Pick a house." }).int().positive("Pick a house."),
      title: required("What needs fixing", 120),
      details: text(1000),
      reportedOn: date("Reported on"),
      handledBy: text(100),
    }),
    fd,
  );
  if ("error" in r) return fail(r.error);
  await db.insert(repairs).values(r.data);
  return done();
}

export async function updateRepair(repairId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const r = parse(z.object({ status: z.enum(REPAIR_STATUSES), cost: optionalPesos, handledBy: text(100) }), fd);
  if ("error" in r) return fail(r.error);
  await db
    .update(repairs)
    .set({ ...r.data, completedOn: r.data.status === "done" ? today() : null })
    .where(eq(repairs.id, repairId));
  return done();
}

// ---- inbox ----
export async function updateInquiry(inquiryId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const r = parse(z.object({ status: z.enum(INQUIRY_STATUSES), ownerNote: text(1000) }), fd);
  if ("error" in r) return fail(r.error);
  await db.update(inquiries).set(r.data).where(eq(inquiries.id, inquiryId));
  return done();
}

// ---- Messenger payments (spec §10) ----
export async function saveGcash(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const name = String(fd.get("gcashName") ?? "").trim().slice(0, 80);
  const file = fd.get("qr");
  if (file instanceof File && file.size > 0) {
    let url: string;
    try {
      url = await saveUpload(file);
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Upload failed.");
    }
    const { gcashQrUrl } = await getPaymentSettings();
    if (gcashQrUrl) await deleteUpload(gcashQrUrl);
    await setSetting("gcash_qr_url", url);
  }
  await setSetting("gcash_name", name);
  return done();
}

/** "Confirm": the claimed payment becomes a real payment for the remaining balance. */
export async function confirmClaim(claimId: number): Promise<void> {
  await requireUser();
  const [claim] = await db.select().from(paymentClaims).where(and(eq(paymentClaims.id, claimId), eq(paymentClaims.status, "pending")));
  if (!claim) return void done();
  const [charge] = await db.select().from(rentCharges).where(eq(rentCharges.id, claim.chargeId));
  const paid = (await db.select({ amount: payments.amount }).from(payments).where(eq(payments.chargeId, claim.chargeId))).reduce((s, p) => s + p.amount, 0);
  const balance = Math.max((charge?.amount ?? 0) - paid, 0);
  if (charge && balance > 0) {
    await db.insert(payments).values({
      chargeId: charge.id,
      tenantId: charge.tenantId,
      houseId: charge.houseId,
      amount: balance,
      paidOn: today(),
      method: claim.method,
      note: "Confirmed from Messenger",
    });
  }
  await db.update(paymentClaims).set({ status: "confirmed" }).where(eq(paymentClaims.id, claimId));
  done();
}

export async function rejectClaim(claimId: number): Promise<void> {
  await requireUser();
  await db.update(paymentClaims).set({ status: "rejected" }).where(eq(paymentClaims.id, claimId));
  done();
}

export async function sendReminderNow(chargeId: number, _prev: FormState, _fd: FormData): Promise<FormState> {
  await requireUser();
  const r = await sendRentReminder(chargeId);
  if (!r) return fail("Nothing to remind: this month is already paid.");
  if (r.status === "sent") return done();
  if (r.status === "dry_run") return fail("Messenger isn't set up yet. Use Copy message instead.");
  return fail(`${r.detail}. Use Copy message instead.`);
}
