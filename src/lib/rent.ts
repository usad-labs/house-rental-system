/**
 * Rent schedule and charge status: pure functions, no database.
 *
 * Each current tenant owes one charge per month, due on their "due day"
 * (clamped to the month's last day). The first charge is the first due day
 * on or after the move-in date.
 */
import { addDays, clampedDate, diffDays, monthPeriod, parseISODate, shiftMonth } from "./dates";

export type ScheduledCharge = { period: string; dueDate: string };

/** First due date on or after move-in. */
export function firstDueDate(moveInDate: string, dueDay: number): string {
  const { y, m } = parseISODate(moveInDate);
  const sameMonth = clampedDate(y, m, dueDay);
  if (sameMonth >= moveInDate) return sameMonth;
  const next = shiftMonth(y, m, 1);
  return clampedDate(next.y, next.m, dueDay);
}

/**
 * All charges a tenant owes from move-in up to and including `until`.
 * Stops before the move-out date (a charge due on/after move-out is not owed).
 */
export function chargeSchedule(input: {
  moveInDate: string;
  dueDay: number;
  until: string;
  movedOutDate?: string | null;
}): ScheduledCharge[] {
  const { moveInDate, dueDay, until, movedOutDate } = input;
  if (dueDay < 1 || dueDay > 31) throw new Error(`Invalid due day: ${dueDay}`);

  const charges: ScheduledCharge[] = [];
  const first = parseISODate(firstDueDate(moveInDate, dueDay));
  for (let i = 0; i < 1200; i++) {
    const { y, m } = shiftMonth(first.y, first.m, i);
    const dueDate = clampedDate(y, m, dueDay);
    if (dueDate > until) break;
    if (movedOutDate && dueDate >= movedOutDate) break;
    charges.push({ period: monthPeriod(dueDate), dueDate });
  }
  return charges;
}

/** Latest date that charges should exist for: today plus the "due soon" window. */
export function chargeHorizon(today: string, dueSoonDays: number): string {
  return addDays(today, dueSoonDays);
}

export type ChargeState = "paid" | "overdue" | "due_today" | "due_soon" | "upcoming";

export type ChargeStatus = {
  state: ChargeState;
  /** Some money received but not the full amount. */
  partial: boolean;
  balance: number;
  /** Days until due (negative when late). */
  daysUntilDue: number;
};

export function chargeStatus(
  charge: { amount: number; paidTotal: number; dueDate: string },
  today: string,
  dueSoonDays: number,
): ChargeStatus {
  const balance = Math.max(charge.amount - charge.paidTotal, 0);
  const daysUntilDue = diffDays(today, charge.dueDate);
  const partial = charge.paidTotal > 0 && balance > 0;

  let state: ChargeState;
  if (balance === 0) state = "paid";
  else if (daysUntilDue < 0) state = "overdue";
  else if (daysUntilDue === 0) state = "due_today";
  else if (daysUntilDue <= dueSoonDays) state = "due_soon";
  else state = "upcoming";

  return { state, partial, balance, daysUntilDue };
}

export const chargeStateLabel: Record<ChargeState, string> = {
  paid: "Paid",
  overdue: "Overdue",
  due_today: "Due today",
  due_soon: "Due soon",
  upcoming: "Upcoming",
};
