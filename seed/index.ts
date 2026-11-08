/**
 * Database setup helpers used by the scripts in /scripts and by tests.
 */
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import type { Database } from "../src/db/client";
import {
  housePhotos,
  houses,
  inquiries,
  paymentClaims,
  payments,
  reminderLog,
  rentCharges,
  repairs,
  sessions,
  settings,
  tenants,
  users,
  utilityBills,
} from "../src/db/schema";
import { addDays } from "../src/lib/dates";
import { hashPassword } from "../src/lib/password";
import { chargeSchedule } from "../src/lib/rent";
import { seedHouses } from "./houses";
import { buildSampleActivity } from "./sample-activity";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export async function migrateDatabase(db: Database, migrationsFolder = MIGRATIONS_FOLDER) {
  await migrate(db, { migrationsFolder });
}

/** Removes all business data (keeps owner logins). */
export async function clearBusinessData(db: Database) {
  await db.delete(reminderLog);
  await db.delete(paymentClaims);
  await db.delete(settings);
  await db.delete(utilityBills);
  await db.delete(payments);
  await db.delete(rentCharges);
  await db.delete(tenants);
  await db.delete(repairs);
  await db.delete(inquiries);
  await db.delete(housePhotos);
  await db.delete(houses);
  await db.run(
    sql`DELETE FROM sqlite_sequence WHERE name IN ('reminder_log','payment_claims','utility_bills','payments','rent_charges','tenants','repairs','inquiries','house_photos','houses')`,
  );
}

/** Loads the 6 houses plus sample tenants, payments, repairs and inquiries. */
export async function seedSampleData(db: Database, today: string) {
  const insertedHouses = await db
    .insert(houses)
    .values(
      seedHouses.map(({ photos: _photos, ...house }, index) => ({
        ...house,
        floorAreaSqm: house.floorAreaSqm ?? null,
        sortOrder: index,
      })),
    )
    .returning({ id: houses.id, slug: houses.slug });
  const houseId = new Map(insertedHouses.map((h) => [h.slug, h.id]));

  await db.insert(housePhotos).values(
    seedHouses.flatMap((house) =>
      house.photos.map((photo, index) => ({
        houseId: houseId.get(house.slug)!,
        url: photo.url,
        alt: photo.alt,
        sortOrder: index,
      })),
    ),
  );

  const activity = buildSampleActivity(today);

  for (const sample of activity.tenants) {
    const hId = houseId.get(sample.houseSlug);
    if (!hId) continue;
    const [tenant] = await db
      .insert(tenants)
      .values({
        houseId: hId,
        fullName: sample.fullName,
        phone: sample.phone,
        email: sample.email,
        moveInDate: sample.moveInDate,
        leaseEndDate: sample.leaseEndDate,
        monthlyRent: sample.monthlyRent,
        dueDay: sample.dueDay,
        depositAmount: sample.depositAmount,
        notes: sample.notes,
        movedOutDate: sample.movedOutDate,
      })
      .returning({ id: tenants.id });

    // Charges up to today + 5 days (the dashboard's "due soon" window).
    const schedule = chargeSchedule({
      moveInDate: sample.moveInDate,
      dueDay: sample.dueDay,
      until: addDays(today, 5),
      movedOutDate: sample.movedOutDate,
    });
    const lastDueIndex = schedule.findLastIndex((c) => c.dueDate <= today);

    for (const [index, item] of schedule.entries()) {
      const [charge] = await db
        .insert(rentCharges)
        .values({ tenantId: tenant.id, houseId: hId, period: item.period, dueDate: item.dueDate, amount: sample.monthlyRent })
        .returning({ id: rentCharges.id });

      if (item.dueDate > today) continue; // not due yet: leave unpaid
      const amount =
        index === lastDueIndex && sample.lastDueChargePaid !== undefined ? sample.lastDueChargePaid : sample.monthlyRent;
      if (amount <= 0) continue;
      await db.insert(payments).values({
        chargeId: charge.id,
        tenantId: tenant.id,
        houseId: hId,
        amount,
        paidOn: index === 0 ? item.dueDate : addDays(item.dueDate, -(index % 3)),
        method: sample.paymentMethod,
        reference: sample.paymentMethod === "gcash" ? `GC${String(4820150000 + index * 7919)}` : sample.paymentMethod === "bank" ? `TRX-${3100 + index}` : "",
        note: index === 0 ? "Advance paid at move-in" : "",
      });
    }
  }

  await db.insert(repairs).values(
    activity.repairs
      .filter((r) => houseId.has(r.houseSlug))
      .map(({ houseSlug, ...repair }) => ({ ...repair, houseId: houseId.get(houseSlug)! })),
  );

  await db.insert(utilityBills).values(
    activity.utilityBills
      .filter((b) => houseId.has(b.houseSlug))
      .map(({ houseSlug, ...bill }) => ({ ...bill, houseId: houseId.get(houseSlug)! })),
  );

  await db.insert(inquiries).values(
    activity.inquiries.map(({ houseSlug, ...inquiry }) => ({
      ...inquiry,
      houseId: houseSlug ? (houseId.get(houseSlug) ?? null) : null,
    })),
  );
}

/** Creates the owner login if that email doesn't exist yet. Returns true if created. */
export async function ensureOwner(db: Database, owner: { email: string; name: string; password: string }) {
  const email = owner.email.trim().toLowerCase();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) return false;
  await db.insert(users).values({ email, name: owner.name, passwordHash: await hashPassword(owner.password) });
  return true;
}

/** Creates an owner, or resets the password (and signs out every device) if the email exists. */
export async function upsertOwner(db: Database, owner: { email: string; name: string; password: string }) {
  const email = owner.email.trim().toLowerCase();
  const passwordHash = await hashPassword(owner.password);
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    await db.update(users).set({ passwordHash, name: owner.name || undefined }).where(eq(users.id, existing.id));
    await db.delete(sessions).where(eq(sessions.userId, existing.id));
    return "updated" as const;
  }
  await db.insert(users).values({ email, name: owner.name, passwordHash });
  return "created" as const;
}
