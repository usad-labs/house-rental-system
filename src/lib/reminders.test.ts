import { describe, expect, it } from "vitest";
import { buildReminders, type ReminderInput } from "./reminders";

const base = { today: "2026-11-06", rentDueSoonDays: 5, leaseEndingSoonDays: 60 };

describe("buildReminders", () => {
  it("flags overdue and due-soon rent, ignoring paid and far-off charges", () => {
    const reminders = buildReminders({
      ...base,
      tenants: [],
      charges: [
        { chargeId: 1, houseId: 1, houseName: "A", tenantName: "T1", dueDate: "2026-10-30", amount: 9000, paidTotal: 0 },
        { chargeId: 2, houseId: 2, houseName: "B", tenantName: "T2", dueDate: "2026-11-09", amount: 8000, paidTotal: 3000 },
        { chargeId: 3, houseId: 3, houseName: "C", tenantName: "T3", dueDate: "2026-11-01", amount: 7000, paidTotal: 7000 },
        { chargeId: 4, houseId: 4, houseName: "D", tenantName: "T4", dueDate: "2026-11-30", amount: 7000, paidTotal: 0 },
      ],
    });

    expect(reminders).toHaveLength(2);
    expect(reminders[0]).toMatchObject({ kind: "rent_overdue", severity: "high", houseId: 1, amount: 9000, days: -7 });
    expect(reminders[1]).toMatchObject({ kind: "rent_due", severity: "medium", houseId: 2, amount: 5000, days: 3 });
  });

  it("flags leases that ended or end soon", () => {
    const reminders = buildReminders({
      ...base,
      charges: [],
      tenants: [
        { houseId: 1, houseName: "A", tenantName: "T1", leaseEndDate: "2026-10-31" },
        { houseId: 2, houseName: "B", tenantName: "T2", leaseEndDate: "2026-12-20" },
        { houseId: 3, houseName: "C", tenantName: "T3", leaseEndDate: "2027-06-30" },
        { houseId: 4, houseName: "D", tenantName: "T4", leaseEndDate: null },
      ],
    });

    expect(reminders.map((r) => [r.kind, r.houseId])).toEqual([
      ["lease_ended", 1],
      ["lease_ending", 2],
    ]);
  });

  it("puts high-severity reminders first, then by date", () => {
    const reminders = buildReminders({
      ...base,
      tenants: [{ houseId: 5, houseName: "E", tenantName: "T5", leaseEndDate: "2026-11-20" }],
      charges: [
        { chargeId: 9, houseId: 6, houseName: "F", tenantName: "T6", dueDate: "2026-11-08", amount: 1, paidTotal: 0 },
        { chargeId: 8, houseId: 7, houseName: "G", tenantName: "T7", dueDate: "2026-11-02", amount: 1, paidTotal: 0 },
      ],
    });
    expect(reminders.map((r) => r.kind)).toEqual(["rent_overdue", "rent_due", "lease_ending"]);
  });
});

describe("utility bill reminders", () => {
  const bill = (over: Partial<NonNullable<ReminderInput["utilityBills"]>[number]>) => ({
    billId: 1, houseId: 1, houseName: "Narra House", tenantName: "", kind: "electric" as const,
    amount: 3000, dueDate: "2026-11-10", cutoffDate: null, paidOn: null, paidBy: "owner" as const, ...over,
  });
  const run = (bills: NonNullable<ReminderInput["utilityBills"]>) =>
    buildReminders({ today: "2026-11-08", rentDueSoonDays: 5, leaseEndingSoonDays: 60, tenants: [], charges: [], utilityBills: bills });

  it("flags overdue bills as high and soon-due bills as medium", () => {
    const r = run([bill({ billId: 1, dueDate: "2026-11-01" }), bill({ billId: 2, dueDate: "2026-11-12" })]);
    expect(r.map((x) => [x.billId, x.kind, x.severity])).toEqual([[1, "utility_overdue", "high"], [2, "utility_due", "medium"]]);
  });

  it("ignores paid bills and bills due later than the window", () => {
    expect(run([bill({ paidOn: "2026-11-05" }), bill({ dueDate: "2026-11-20" })])).toEqual([]);
  });
});
