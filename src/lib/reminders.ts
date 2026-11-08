/**
 * Dashboard reminders: pure function over current tenants and unpaid charges.
 */
import { diffDays } from "./dates";
import { chargeStatus } from "./rent";

export type ReminderKind = "rent_overdue" | "rent_due" | "lease_ended" | "lease_ending" | "utility_overdue" | "utility_due";

export type Reminder = {
  kind: ReminderKind;
  severity: "high" | "medium";
  houseId: number;
  houseName: string;
  tenantName: string;
  /** The date the reminder is about (due date or lease end). */
  date: string;
  /** Days from today to `date` (negative = in the past). */
  days: number;
  /** Unpaid balance for rent reminders. */
  amount?: number;
  chargeId?: number;
  /** Utility reminders: the bill, its kind and who pays it. */
  billId?: number;
  utilityKind?: "electric" | "water";
  paidBy?: "tenant" | "owner";
  cutoffDate?: string | null;
};

export type ReminderInput = {
  today: string;
  rentDueSoonDays: number;
  leaseEndingSoonDays: number;
  tenants: Array<{
    houseId: number;
    houseName: string;
    tenantName: string;
    leaseEndDate: string | null;
  }>;
  utilityBills?: Array<{
    billId: number;
    houseId: number;
    houseName: string;
    tenantName: string;
    kind: "electric" | "water";
    amount: number;
    dueDate: string;
    cutoffDate: string | null;
    paidOn: string | null;
    paidBy: "tenant" | "owner";
  }>;
  charges: Array<{
    chargeId: number;
    houseId: number;
    houseName: string;
    tenantName: string;
    dueDate: string;
    amount: number;
    paidTotal: number;
  }>;
};

export function buildReminders(input: ReminderInput): Reminder[] {
  const reminders: Reminder[] = [];

  for (const charge of input.charges) {
    const status = chargeStatus(charge, input.today, input.rentDueSoonDays);
    if (status.state === "overdue") {
      reminders.push({
        kind: "rent_overdue",
        severity: "high",
        houseId: charge.houseId,
        houseName: charge.houseName,
        tenantName: charge.tenantName,
        date: charge.dueDate,
        days: status.daysUntilDue,
        amount: status.balance,
        chargeId: charge.chargeId,
      });
    } else if (status.state === "due_today" || status.state === "due_soon") {
      reminders.push({
        kind: "rent_due",
        severity: "medium",
        houseId: charge.houseId,
        houseName: charge.houseName,
        tenantName: charge.tenantName,
        date: charge.dueDate,
        days: status.daysUntilDue,
        amount: status.balance,
        chargeId: charge.chargeId,
      });
    }
  }

  for (const tenant of input.tenants) {
    if (!tenant.leaseEndDate) continue;
    const days = diffDays(input.today, tenant.leaseEndDate);
    if (days < 0) {
      reminders.push({
        kind: "lease_ended",
        severity: "high",
        houseId: tenant.houseId,
        houseName: tenant.houseName,
        tenantName: tenant.tenantName,
        date: tenant.leaseEndDate,
        days,
      });
    } else if (days <= input.leaseEndingSoonDays) {
      reminders.push({
        kind: "lease_ending",
        severity: "medium",
        houseId: tenant.houseId,
        houseName: tenant.houseName,
        tenantName: tenant.tenantName,
        date: tenant.leaseEndDate,
        days,
      });
    }
  }

  // Unpaid utility bills: overdue (risk of disconnection) or due within the "due soon" window.
  for (const bill of input.utilityBills ?? []) {
    if (bill.paidOn) continue;
    const days = diffDays(input.today, bill.dueDate);
    if (days > input.rentDueSoonDays) continue;
    reminders.push({
      kind: days < 0 ? "utility_overdue" : "utility_due",
      severity: days < 0 ? "high" : "medium",
      houseId: bill.houseId,
      houseName: bill.houseName,
      tenantName: bill.tenantName,
      date: bill.dueDate,
      days,
      amount: bill.amount,
      billId: bill.billId,
      utilityKind: bill.kind,
      paidBy: bill.paidBy,
      cutoffDate: bill.cutoffDate,
    });
  }

  const severityRank = { high: 0, medium: 1 } as const;
  return reminders.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      a.date.localeCompare(b.date) ||
      a.houseName.localeCompare(b.houseName),
  );
}
