/**
 * Database schema (SQLite / libSQL via Drizzle).
 * Dates are "YYYY-MM-DD" text; timestamps are UTC "YYYY-MM-DD HH:MM:SS"; money is whole pesos.
 * Imports stay relative so drizzle-kit can load this file without path aliases.
 */
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { CLAIM_METHODS, CLAIM_STATUSES, INQUIRY_STATUSES, PAYMENT_METHODS, PREFERRED_TIMES, REPAIR_STATUSES, UTILITY_KINDS, UTILITY_PAYERS } from "../lib/options";
import { HOUSE_STATUSES } from "../lib/status";

const createdAt = () => text("created_at").notNull().default(sql`(datetime('now'))`);

export const houses = sqliteTable("houses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /** e.g. "2-storey house", "Bungalow" */
  type: text("type").notNull().default(""),
  /** Shown publicly, e.g. "Brgy. San Roque, Sample City". */
  publicLocation: text("public_location").notNull(),
  /** Exact address: dashboard only, never on public pages. */
  fullAddress: text("full_address").notNull().default(""),
  mapUrl: text("map_url").notNull().default(""),
  monthlyRent: integer("monthly_rent").notNull(),
  bedrooms: integer("bedrooms").notNull().default(0),
  bathrooms: integer("bathrooms").notNull().default(0),
  floorAreaSqm: integer("floor_area_sqm"),
  lotAreaSqm: integer("lot_area_sqm"),
  /** "own" = own water/electric meter, "shared" = shared utilities. */
  utilities: text("utilities", { enum: ["own", "shared"] }).notNull().default("own"),
  description: text("description").notNull().default(""),
  features: text("features", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  /** Rental terms, e.g. "1 month advance + 2 months deposit". */
  terms: text("terms").notNull().default(""),
  status: text("status", { enum: HOUSE_STATUSES }).notNull().default("vacant"),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const housePhotos = sqliteTable(
  "house_photos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    houseId: integer("house_id")
      .notNull()
      .references(() => houses.id),
    url: text("url").notNull(),
    alt: text("alt").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("house_photos_house_idx").on(t.houseId)],
);

export const tenants = sqliteTable(
  "tenants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    houseId: integer("house_id")
      .notNull()
      .references(() => houses.id),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull().default(""),
    moveInDate: text("move_in_date").notNull(),
    /** Null = no fixed end (month-to-month). */
    leaseEndDate: text("lease_end_date"),
    monthlyRent: integer("monthly_rent").notNull(),
    /** Day of the month rent is due (1-31, clamped to the month's last day). */
    dueDay: integer("due_day").notNull(),
    depositAmount: integer("deposit_amount"),
    notes: text("notes").notNull().default(""),
    /** Null = current tenant. */
    movedOutDate: text("moved_out_date"),
    /** Messenger page-scoped ID, saved when the tenant taps their "Connect Messenger" link. */
    messengerPsid: text("messenger_psid"),
    /** Random token in that link (m.me/<page>?ref=<token>); identifies the tenant without exposing the id. */
    messengerLinkToken: text("messenger_link_token"),
    createdAt: createdAt(),
  },
  (t) => [
    index("tenants_house_idx").on(t.houseId),
    // At most one current tenant per house.
    uniqueIndex("tenants_one_current_per_house").on(t.houseId).where(sql`moved_out_date IS NULL`),
  ],
);

export const rentCharges = sqliteTable(
  "rent_charges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id),
    houseId: integer("house_id")
      .notNull()
      .references(() => houses.id),
    /** "YYYY-MM" */
    period: text("period").notNull(),
    dueDate: text("due_date").notNull(),
    amount: integer("amount").notNull(),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("rent_charges_tenant_period").on(t.tenantId, t.period),
    index("rent_charges_house_idx").on(t.houseId),
    index("rent_charges_due_idx").on(t.dueDate),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chargeId: integer("charge_id")
      .notNull()
      .references(() => rentCharges.id),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id),
    houseId: integer("house_id")
      .notNull()
      .references(() => houses.id),
    amount: integer("amount").notNull(),
    paidOn: text("paid_on").notNull(),
    method: text("method", { enum: PAYMENT_METHODS }).notNull().default("cash"),
    reference: text("reference").notNull().default(""),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("payments_charge_idx").on(t.chargeId), index("payments_house_idx").on(t.houseId)],
);

export const repairs = sqliteTable(
  "repairs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    houseId: integer("house_id")
      .notNull()
      .references(() => houses.id),
    title: text("title").notNull(),
    details: text("details").notNull().default(""),
    reportedOn: text("reported_on").notNull(),
    status: text("status", { enum: REPAIR_STATUSES }).notNull().default("open"),
    completedOn: text("completed_on"),
    cost: integer("cost"),
    handledBy: text("handled_by").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("repairs_house_idx").on(t.houseId)],
);

export const inquiries = sqliteTable(
  "inquiries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Null = general inquiry (not about one house). */
    houseId: integer("house_id").references(() => houses.id),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull().default(""),
    preferredDate: text("preferred_date"),
    preferredTime: text("preferred_time", { enum: PREFERRED_TIMES }),
    message: text("message").notNull().default(""),
    status: text("status", { enum: INQUIRY_STATUSES }).notNull().default("new"),
    ownerNote: text("owner_note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("inquiries_status_idx").on(t.status)],
);

/** "Paid via GCash" / "Will pay cash" answers from Messenger, waiting for the owner to confirm (spec §10.2). */
export const paymentClaims = sqliteTable(
  "payment_claims",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    chargeId: integer("charge_id")
      .notNull()
      .references(() => rentCharges.id),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id),
    method: text("method", { enum: CLAIM_METHODS }).notNull(),
    /** Receipt screenshot the tenant sent (saved to uploads). */
    proofUrl: text("proof_url"),
    status: text("status", { enum: CLAIM_STATUSES }).notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [index("payment_claims_status_idx").on(t.status)],
);

/** Every reminder sent (or attempted), shown per tenant in the dashboard. */
export const reminderLog = sqliteTable(
  "reminder_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenants.id),
    chargeId: integer("charge_id").references(() => rentCharges.id),
    /** sent | not_connected | failed | dry_run */
    status: text("status").notNull(),
    detail: text("detail").notNull().default(""),
    sentOn: text("sent_on").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("reminder_log_charge_idx").on(t.chargeId)],
);

/** Small owner settings (GCash QR image, account name). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** Electricity / water bills, so the family can see nothing is about to be cut off (spec §10.1). */
export const utilityBills = sqliteTable(
  "utility_bills",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    houseId: integer("house_id")
      .notNull()
      .references(() => houses.id),
    kind: text("kind", { enum: UTILITY_KINDS }).notNull(),
    /** "YYYY-MM" billing month */
    period: text("period").notNull(),
    amount: integer("amount").notNull(),
    dueDate: text("due_date").notNull(),
    /** Disconnection date printed on the bill, if any. */
    cutoffDate: text("cutoff_date"),
    paidOn: text("paid_on"),
    /** Who pays this bill: the tenant (own meter) or the owner (shared). */
    paidBy: text("paid_by", { enum: UTILITY_PAYERS }).notNull().default("tenant"),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("utility_bills_house_idx").on(t.houseId), index("utility_bills_due_idx").on(t.dueDate)],
);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 of the session token (the raw token only lives in the cookie). */
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    /** Unix time in milliseconds. */
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export type House = typeof houses.$inferSelect;
export type HousePhoto = typeof housePhotos.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type RentCharge = typeof rentCharges.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Repair = typeof repairs.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type User = typeof users.$inferSelect;
export type UtilityBill = typeof utilityBills.$inferSelect;
export type PaymentClaim = typeof paymentClaims.$inferSelect;
