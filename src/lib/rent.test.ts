import { describe, expect, it } from "vitest";
import { chargeHorizon, chargeSchedule, chargeStatus, firstDueDate } from "./rent";

describe("firstDueDate", () => {
  it("uses the move-in month when the due day has not passed", () => {
    expect(firstDueDate("2026-03-15", 15)).toBe("2026-03-15");
    expect(firstDueDate("2026-03-01", 10)).toBe("2026-03-10");
  });

  it("moves to next month when the due day already passed", () => {
    expect(firstDueDate("2026-03-20", 5)).toBe("2026-04-05");
    expect(firstDueDate("2026-12-20", 5)).toBe("2027-01-05");
  });

  it("clamps day 31 to short months", () => {
    expect(firstDueDate("2026-01-31", 31)).toBe("2026-01-31");
    expect(firstDueDate("2026-02-10", 31)).toBe("2026-02-28");
  });
});

describe("chargeSchedule", () => {
  it("creates one charge per month, clamped at month end", () => {
    expect(chargeSchedule({ moveInDate: "2026-01-31", dueDay: 31, until: "2026-05-01" })).toEqual([
      { period: "2026-01", dueDate: "2026-01-31" },
      { period: "2026-02", dueDate: "2026-02-28" },
      { period: "2026-03", dueDate: "2026-03-31" },
      { period: "2026-04", dueDate: "2026-04-30" },
    ]);
  });

  it("includes a charge due exactly on the horizon date", () => {
    const charges = chargeSchedule({ moveInDate: "2026-09-10", dueDay: 10, until: "2026-11-10" });
    expect(charges.map((c) => c.dueDate)).toEqual(["2026-09-10", "2026-10-10", "2026-11-10"]);
  });

  it("stops before the move-out date", () => {
    const charges = chargeSchedule({
      moveInDate: "2026-01-10",
      dueDay: 10,
      until: "2026-12-31",
      movedOutDate: "2026-04-10",
    });
    expect(charges.map((c) => c.period)).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("returns nothing before the first due date", () => {
    expect(chargeSchedule({ moveInDate: "2026-11-20", dueDay: 20, until: "2026-11-19" })).toEqual([]);
  });

  it("rejects impossible due days", () => {
    expect(() => chargeSchedule({ moveInDate: "2026-01-01", dueDay: 0, until: "2026-02-01" })).toThrow();
    expect(() => chargeSchedule({ moveInDate: "2026-01-01", dueDay: 32, until: "2026-02-01" })).toThrow();
  });
});

describe("chargeHorizon", () => {
  it("is today plus the due-soon window", () => {
    expect(chargeHorizon("2026-11-28", 5)).toBe("2026-12-03");
  });
});

describe("chargeStatus", () => {
  const today = "2026-11-06";

  it("is paid when the balance is zero, even if overpaid", () => {
    expect(chargeStatus({ amount: 9000, paidTotal: 9000, dueDate: "2026-11-01" }, today, 5)).toMatchObject({
      state: "paid",
      partial: false,
      balance: 0,
    });
    expect(chargeStatus({ amount: 9000, paidTotal: 9500, dueDate: "2026-11-01" }, today, 5).balance).toBe(0);
  });

  it("is overdue after the due date", () => {
    expect(chargeStatus({ amount: 9000, paidTotal: 0, dueDate: "2026-11-01" }, today, 5)).toMatchObject({
      state: "overdue",
      daysUntilDue: -5,
      balance: 9000,
    });
  });

  it("flags partial payments", () => {
    expect(chargeStatus({ amount: 9000, paidTotal: 4000, dueDate: "2026-11-01" }, today, 5)).toMatchObject({
      state: "overdue",
      partial: true,
      balance: 5000,
    });
  });

  it("separates due today, due soon and upcoming", () => {
    expect(chargeStatus({ amount: 1, paidTotal: 0, dueDate: "2026-11-06" }, today, 5).state).toBe("due_today");
    expect(chargeStatus({ amount: 1, paidTotal: 0, dueDate: "2026-11-11" }, today, 5).state).toBe("due_soon");
    expect(chargeStatus({ amount: 1, paidTotal: 0, dueDate: "2026-11-12" }, today, 5).state).toBe("upcoming");
  });
});
