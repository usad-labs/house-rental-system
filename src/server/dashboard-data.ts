/**
 * Private dashboard reads. Every exported function checks the login first (spec §5.2).
 */
import "server-only";
import { asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { siteConfig } from "@/config/site";
import { db } from "@/db";
import { housePhotos, houses, inquiries, paymentClaims, payments, reminderLog, rentCharges, repairs, tenants, utilityBills } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { buildReminders } from "@/lib/reminders";
import { chargeHorizon, chargeSchedule, chargeStatus } from "@/lib/rent";
import { ensureLinkToken, reminderCopyText } from "./messenger";

const dueSoon = siteConfig.reminders.rentDueSoonDays;
export const today = () => todayISO(siteConfig.timeZone);

const paidTotal = sql<number>`coalesce((select sum(${payments.amount}) from ${payments} where ${payments.chargeId} = ${rentCharges.id}), 0)`;
const coverUrl = sql<string | null>`(select ${housePhotos.url} from ${housePhotos} where ${housePhotos.houseId} = "houses"."id" order by ${housePhotos.sortOrder}, ${housePhotos.id} limit 1)`;

/** Spec §5.3: give every current tenant their missing monthly charges, up to today + the due-soon window. Idempotent. */
export async function syncCharges(day = today()) {
  const current = await db.select().from(tenants).where(isNull(tenants.movedOutDate));
  const until = chargeHorizon(day, dueSoon);
  for (const t of current) {
    const rows = chargeSchedule({ moveInDate: t.moveInDate, dueDay: t.dueDay, until, movedOutDate: t.movedOutDate }).map((c) => ({
      tenantId: t.id,
      houseId: t.houseId,
      period: c.period,
      dueDate: c.dueDate,
      amount: t.monthlyRent,
    }));
    if (rows.length) await db.insert(rentCharges).values(rows).onConflictDoNothing();
  }
}

async function chargesWithStatus(where?: ReturnType<typeof eq>) {
  const day = today();
  const rows = await db
    .select({
      id: rentCharges.id,
      houseId: rentCharges.houseId,
      houseName: houses.name,
      tenantId: rentCharges.tenantId,
      tenantName: tenants.fullName,
      tenantPhone: tenants.phone,
      period: rentCharges.period,
      dueDate: rentCharges.dueDate,
      amount: rentCharges.amount,
      paidTotal,
    })
    .from(rentCharges)
    .innerJoin(houses, eq(houses.id, rentCharges.houseId))
    .innerJoin(tenants, eq(tenants.id, rentCharges.tenantId))
    .where(where)
    .orderBy(desc(rentCharges.dueDate), asc(houses.sortOrder));
  return rows.map((c) => ({ ...c, status: chargeStatus(c, day, dueSoon) }));
}
export type ChargeRow = Awaited<ReturnType<typeof chargesWithStatus>>[number];

async function billsWithHouse(where?: ReturnType<typeof eq>) {
  return db
    .select({
      id: utilityBills.id,
      houseId: utilityBills.houseId,
      houseName: houses.name,
      kind: utilityBills.kind,
      period: utilityBills.period,
      amount: utilityBills.amount,
      dueDate: utilityBills.dueDate,
      cutoffDate: utilityBills.cutoffDate,
      paidOn: utilityBills.paidOn,
      paidBy: utilityBills.paidBy,
      note: utilityBills.note,
    })
    .from(utilityBills)
    .innerJoin(houses, eq(houses.id, utilityBills.houseId))
    .where(where)
    .orderBy(desc(utilityBills.dueDate));
}
export type BillRow = Awaited<ReturnType<typeof billsWithHouse>>[number];

export async function getOverview() {
  const user = await requireUser();
  const day = today();
  await syncCharges(day);

  const [houseRows, currentTenants, charges, bills, openRepairs, newInquiries] = await Promise.all([
    db.select({ id: houses.id, name: houses.name, status: houses.status, coverUrl }).from(houses).orderBy(asc(houses.sortOrder), asc(houses.id)),
    db
      .select({ houseId: tenants.houseId, houseName: houses.name, tenantName: tenants.fullName, tenantPhone: tenants.phone, leaseEndDate: tenants.leaseEndDate })
      .from(tenants)
      .innerJoin(houses, eq(houses.id, tenants.houseId))
      .where(isNull(tenants.movedOutDate)),
    chargesWithStatus(),
    billsWithHouse(),
    db.select({ houseId: repairs.houseId, title: repairs.title }).from(repairs).where(inArray(repairs.status, ["open", "in_progress"])),
    db.select({ houseId: inquiries.houseId }).from(inquiries).where(eq(inquiries.status, "new")),
  ]);

  const tenantByHouse = new Map(currentTenants.map((t) => [t.houseId, t]));
  const unpaid = charges.filter((c) => c.status.state !== "paid" && tenantByHouse.has(c.houseId));
  const reminders = buildReminders({
    today: day,
    rentDueSoonDays: dueSoon,
    leaseEndingSoonDays: siteConfig.reminders.leaseEndingSoonDays,
    tenants: currentTenants,
    charges: unpaid.map((c) => ({ ...c, chargeId: c.id })),
    utilityBills: bills.map((b) => ({ ...b, billId: b.id, tenantName: tenantByHouse.get(b.houseId)?.tenantName ?? "" })),
  });

  // Newest charge that is already due (or due soon), per house: drives the rent line on each tile.
  const latestCharge = new Map<number, (typeof charges)[number]>();
  for (const c of charges) if (tenantByHouse.has(c.houseId) && c.status.state !== "upcoming" && !latestCharge.has(c.houseId)) latestCharge.set(c.houseId, c);

  const tiles = houseRows.map((h) => ({
    ...h,
    tenantName: tenantByHouse.get(h.id)?.tenantName ?? null,
    charge: latestCharge.get(h.id) ?? null,
    repair: openRepairs.find((r) => r.houseId === h.id)?.title ?? null,
    viewingRequests: newInquiries.filter((i) => i.houseId === h.id).length,
  }));

  // Money summary: rent still owed on charges already due (or due soon), and payments received this month.
  const toCollect = unpaid.filter((c) => c.status.state !== "upcoming").reduce((sum, c) => sum + c.status.balance, 0);
  const [{ collected }] = await db
    .select({ collected: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(sql`${payments.paidOn} >= ${`${day.slice(0, 7)}-01`}`);

  return {
    user,
    today: day,
    reminders,
    tiles,
    occupied: currentTenants.length,
    newInquiries: newInquiries.length,
    toCollect,
    collected,
    openRepairs: openRepairs.length,
    claims: await pendingClaims(),
    phoneByHouse: Object.fromEntries(currentTenants.map((t) => [t.houseId, t.tenantPhone])),
  };
}

/** Messenger answers waiting for the owner, newest first, with what's still owed on that charge. */
async function pendingClaims() {
  const rows = await db
    .select({
      id: paymentClaims.id,
      method: paymentClaims.method,
      proofUrl: paymentClaims.proofUrl,
      chargeId: paymentClaims.chargeId,
      tenantName: tenants.fullName,
      houseId: houses.id,
      houseName: houses.name,
      period: rentCharges.period,
      amount: rentCharges.amount,
      paidTotal: sql<number>`coalesce((select sum(${payments.amount}) from ${payments} where ${payments.chargeId} = ${rentCharges.id}), 0)`,
    })
    .from(paymentClaims)
    .innerJoin(rentCharges, eq(rentCharges.id, paymentClaims.chargeId))
    .innerJoin(tenants, eq(tenants.id, paymentClaims.tenantId))
    .innerJoin(houses, eq(houses.id, rentCharges.houseId))
    .where(eq(paymentClaims.status, "pending"))
    .orderBy(desc(paymentClaims.id));
  return rows.map((r) => ({ ...r, balance: Math.max(r.amount - r.paidTotal, 0) }));
}
export type ClaimRow = Awaited<ReturnType<typeof pendingClaims>>[number];

export async function getHouseDetail(id: number) {
  await requireUser();
  await syncCharges();
  const [house] = await db.select().from(houses).where(eq(houses.id, id)).limit(1);
  if (!house) return null;
  const [photos, tenantRows, charges, payRows, bills, repairRows] = await Promise.all([
    db.select().from(housePhotos).where(eq(housePhotos.houseId, id)).orderBy(asc(housePhotos.sortOrder), asc(housePhotos.id)),
    db.select().from(tenants).where(eq(tenants.houseId, id)).orderBy(desc(tenants.moveInDate)),
    chargesWithStatus(eq(rentCharges.houseId, id)),
    db.select().from(payments).where(eq(payments.houseId, id)).orderBy(desc(payments.paidOn), desc(payments.id)),
    billsWithHouse(eq(utilityBills.houseId, id)),
    db.select().from(repairs).where(eq(repairs.houseId, id)).orderBy(desc(repairs.reportedOn)),
  ]);
  const tenant = tenantRows.find((t) => !t.movedOutDate) ?? null;
  const unpaidIds = charges.filter((c) => c.status.balance > 0 && c.tenantId === tenant?.id).map((c) => c.id);
  const [linkToken, copyTexts, lastReminders] = await Promise.all([
    tenant ? ensureLinkToken(tenant.id) : null,
    Promise.all(unpaidIds.map(async (cid) => [cid, await reminderCopyText(cid)] as const)),
    tenant ? db.select().from(reminderLog).where(eq(reminderLog.tenantId, tenant.id)).orderBy(desc(reminderLog.id)).limit(5) : [],
  ]);
  return {
    house,
    photos,
    tenant,
    linkToken,
    copyTexts: Object.fromEntries(copyTexts),
    lastReminders,
    pastTenants: tenantRows.filter((t) => t.movedOutDate),
    charges,
    payments: payRows,
    bills,
    repairs: repairRows,
  };
}

export async function getHouseList() {
  await requireUser();
  return db
    .select({
      id: houses.id,
      name: houses.name,
      status: houses.status,
      isPublished: houses.isPublished,
      monthlyRent: houses.monthlyRent,
      coverUrl,
      tenantName: sql<string | null>`(select ${tenants.fullName} from ${tenants} where ${tenants.houseId} = "houses"."id" and ${tenants.movedOutDate} is null)`,
    })
    .from(houses)
    .orderBy(asc(houses.sortOrder), asc(houses.id));
}

export async function getMoney() {
  await requireUser();
  await syncCharges();
  const [charges, bills, recent] = await Promise.all([
    chargesWithStatus(),
    billsWithHouse(),
    db
      .select({
        id: payments.id,
        amount: payments.amount,
        paidOn: payments.paidOn,
        method: payments.method,
        reference: payments.reference,
        houseName: houses.name,
        tenantName: tenants.fullName,
        period: rentCharges.period,
      })
      .from(payments)
      .innerJoin(houses, eq(houses.id, payments.houseId))
      .innerJoin(tenants, eq(tenants.id, payments.tenantId))
      .innerJoin(rentCharges, eq(rentCharges.id, payments.chargeId))
      .orderBy(desc(payments.paidOn), desc(payments.id))
      .limit(30),
  ]);
  return { today: today(), charges, bills, recent, houses: await db.select({ id: houses.id, name: houses.name }).from(houses).orderBy(asc(houses.sortOrder)) };
}

export async function getRepairs() {
  await requireUser();
  const [rows, houseRows] = await Promise.all([
    db
      .select({ repair: repairs, houseName: houses.name })
      .from(repairs)
      .innerJoin(houses, eq(houses.id, repairs.houseId))
      .orderBy(sql`case ${repairs.status} when 'open' then 0 when 'in_progress' then 1 else 2 end`, desc(repairs.reportedOn)),
    db.select({ id: houses.id, name: houses.name }).from(houses).orderBy(asc(houses.sortOrder)),
  ]);
  return { rows, houses: houseRows, today: today() };
}

export async function getInbox() {
  await requireUser();
  return db
    .select({ inquiry: inquiries, houseName: houses.name, houseSlug: houses.slug })
    .from(inquiries)
    .leftJoin(houses, eq(houses.id, inquiries.houseId))
    .orderBy(sql`case ${inquiries.status} when 'new' then 0 when 'contacted' then 1 else 2 end`, desc(inquiries.createdAt));
}

/** For the Inbox badge in the tab bar. Returns 0 when not logged in (no redirect, so the layout can call it). */
export async function countNewInquiries(): Promise<number> {
  if (!(await getCurrentUser())) return 0;
  return db.$count(inquiries, eq(inquiries.status, "new"));
}
