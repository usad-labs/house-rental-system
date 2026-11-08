/**
 * Messenger data side: linking tenants, saving "Paid via GCash" / "Will pay cash" answers and receipts,
 * and sending rent reminders. Called by the webhook, the daily job and dashboard actions (which check the login).
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { siteConfig } from "@/config/site";
import { db } from "@/db";
import { houses, paymentClaims, payments, reminderLog, rentCharges, settings, tenants } from "@/db/schema";
import { diffDays, formatShortDate, todayISO } from "@/lib/dates";
import { rentReminderMessages, reminderPlainText, sendMessages, type OutMessage, type SendResult } from "@/lib/messenger";
import { formatMoney } from "@/lib/money";
import { chargeStatus } from "@/lib/rent";
import { shouldRemind } from "@/lib/reminder-schedule";
import { saveUpload } from "@/lib/storage";

const today = () => todayISO(siteConfig.timeZone);

// ---- settings ----
export async function getPaymentSettings() {
  const rows = await db.select().from(settings);
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
  return { gcashQrUrl: get("gcash_qr_url") || null, gcashName: get("gcash_name") };
}

export async function setSetting(key: string, value: string) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

/** Absolute URL for an uploaded file (Messenger can only fetch public HTTPS links, so this works once online). */
function publicUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env.SITE_URL?.replace(/\/$/, "");
  return base ? `${base}${path}` : null;
}

// ---- tenant link ----
export async function ensureLinkToken(tenantId: number): Promise<string> {
  const [t] = await db.select({ token: tenants.messengerLinkToken }).from(tenants).where(eq(tenants.id, tenantId));
  if (t?.token) return t.token;
  const token = randomBytes(9).toString("base64url");
  await db.update(tenants).set({ messengerLinkToken: token }).where(eq(tenants.id, tenantId));
  return token;
}

const currentTenantByPsid = async (psid: string) =>
  (await db.select().from(tenants).where(and(eq(tenants.messengerPsid, psid), isNull(tenants.movedOutDate))).limit(1))[0];

/** Webhook: tenant tapped their m.me link. Returns the tenant's first name, or null for an unknown token. */
export async function linkTenant(psid: string, token: string): Promise<string | null> {
  const [t] = await db
    .update(tenants)
    .set({ messengerPsid: psid })
    .where(and(eq(tenants.messengerLinkToken, token), isNull(tenants.movedOutDate)))
    .returning({ name: tenants.fullName });
  return t ? t.name.split(" ")[0] : null;
}

/** Webhook: "Paid via GCash" / "Will pay cash". Only accepted for that tenant's own unpaid charge. */
export async function createClaim(psid: string, method: "gcash" | "cash", chargeId: number): Promise<boolean> {
  const tenant = await currentTenantByPsid(psid);
  if (!tenant) return false;
  const [charge] = await db.select().from(rentCharges).where(and(eq(rentCharges.id, chargeId), eq(rentCharges.tenantId, tenant.id)));
  if (!charge) return false;
  const pending = await db.$count(paymentClaims, and(eq(paymentClaims.chargeId, chargeId), eq(paymentClaims.status, "pending")));
  if (pending > 0) await db.update(paymentClaims).set({ method }).where(and(eq(paymentClaims.chargeId, chargeId), eq(paymentClaims.status, "pending")));
  else await db.insert(paymentClaims).values({ chargeId, tenantId: tenant.id, method });
  return true;
}

/** Webhook: a photo from a tenant is kept as the receipt on their latest pending GCash claim. */
export async function attachProof(psid: string, imageUrl: string): Promise<boolean> {
  const tenant = await currentTenantByPsid(psid);
  if (!tenant) return false;
  const [claim] = await db
    .select()
    .from(paymentClaims)
    .where(and(eq(paymentClaims.tenantId, tenant.id), eq(paymentClaims.status, "pending")))
    .orderBy(desc(paymentClaims.id))
    .limit(1);
  if (!claim) return false;
  const res = await fetch(imageUrl).catch(() => null);
  if (!res?.ok) return false;
  const blob = await res.blob();
  const url = await saveUpload(new File([blob], "receipt", { type: blob.type || "image/jpeg" })).catch(() => null);
  if (!url) return false;
  await db.update(paymentClaims).set({ proofUrl: url }).where(eq(paymentClaims.id, claim.id));
  return true;
}

// ---- reminders ----
async function reminderFor(chargeId: number) {
  const [row] = await db
    .select({
      charge: rentCharges,
      tenantId: tenants.id,
      fullName: tenants.fullName,
      psid: tenants.messengerPsid,
      houseName: houses.name,
      paidTotal: sql<number>`coalesce((select sum(${payments.amount}) from ${payments} where ${payments.chargeId} = ${rentCharges.id}), 0)`,
    })
    .from(rentCharges)
    .innerJoin(tenants, eq(tenants.id, rentCharges.tenantId))
    .innerJoin(houses, eq(houses.id, rentCharges.houseId))
    .where(and(eq(rentCharges.id, chargeId), isNull(tenants.movedOutDate)));
  if (!row) return null;
  const day = today();
  const status = chargeStatus({ ...row.charge, paidTotal: row.paidTotal }, day, siteConfig.reminders.rentDueSoonDays);
  const { gcashQrUrl, gcashName } = await getPaymentSettings();
  const messages: OutMessage[] = rentReminderMessages({
    firstName: row.fullName.split(" ")[0],
    houseName: row.houseName,
    amountText: formatMoney(status.balance),
    dueText: formatShortDate(row.charge.dueDate),
    overdue: diffDays(day, row.charge.dueDate) < 0,
    chargeId,
    qrUrl: publicUrl(gcashQrUrl),
    gcashName,
    businessName: siteConfig.businessName,
  });
  return { row, status, messages, day };
}

/** Text for the "Copy message" button (when the tenant isn't on Messenger yet, or sending failed). */
export async function reminderCopyText(chargeId: number): Promise<string | null> {
  const r = await reminderFor(chargeId);
  return r ? reminderPlainText(r.messages, "") : null;
}

/** Sends one rent reminder now and logs it. */
export async function sendRentReminder(chargeId: number): Promise<SendResult | null> {
  const r = await reminderFor(chargeId);
  if (!r || r.status.balance === 0) return null;
  const result: SendResult = r.row.psid ? await sendMessages(r.row.psid, r.messages) : { status: "failed", detail: "Tenant hasn't connected Messenger yet" };
  await db.insert(reminderLog).values({
    tenantId: r.row.tenantId,
    chargeId,
    status: r.row.psid ? result.status : "not_connected",
    detail: result.detail,
    sentOn: r.day,
  });
  return result;
}

/** Daily job: remind every unpaid charge that is on its schedule today (once per charge per day). */
export async function runDailyReminders(): Promise<{ checked: number; sent: number; skipped: number }> {
  const day = today();
  const due = await db
    .select({ id: rentCharges.id, dueDate: rentCharges.dueDate })
    .from(rentCharges)
    .innerJoin(tenants, eq(tenants.id, rentCharges.tenantId))
    .where(and(isNull(tenants.movedOutDate), sql`${rentCharges.amount} > coalesce((select sum(${payments.amount}) from ${payments} where ${payments.chargeId} = ${rentCharges.id}), 0)`));
  let sent = 0;
  let skipped = 0;
  for (const c of due) {
    if (!shouldRemind(day, c.dueDate)) continue;
    const already = await db.$count(reminderLog, and(eq(reminderLog.chargeId, c.id), eq(reminderLog.sentOn, day)));
    if (already) {
      skipped++;
      continue;
    }
    const r = await sendRentReminder(c.id);
    if (r?.status === "sent") sent++;
  }
  return { checked: due.length, sent, skipped };
}
