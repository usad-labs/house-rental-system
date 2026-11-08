import { describe, expect, it } from "vitest";
import {
  addDays,
  clampedDate,
  daysInMonth,
  diffDays,
  formatDate,
  formatPeriod,
  formatTimestamp,
  isISODate,
  parseISODate,
  relativeDays,
  shiftMonth,
  todayISO,
} from "./dates";

describe("dates", () => {
  it("knows month lengths, including leap years", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  it("clamps a due day to the end of short months", () => {
    expect(clampedDate(2026, 2, 31)).toBe("2026-02-28");
    expect(clampedDate(2024, 2, 30)).toBe("2024-02-29");
    expect(clampedDate(2026, 4, 31)).toBe("2026-04-30");
    expect(clampedDate(2026, 5, 15)).toBe("2026-05-15");
  });

  it("shifts months across year boundaries", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ y: 2027, m: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ y: 2025, m: 12 });
    expect(shiftMonth(2026, 11, 14)).toEqual({ y: 2028, m: 1 });
  });

  it("adds and diffs days", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(diffDays("2026-11-06", "2026-11-11")).toBe(5);
    expect(diffDays("2026-11-06", "2026-10-31")).toBe(-6);
    expect(diffDays("2026-03-01", "2026-03-01")).toBe(0);
  });

  it("validates ISO dates", () => {
    expect(parseISODate("2026-11-06")).toEqual({ y: 2026, m: 11, d: 6 });
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("2026-13-01")).toBe(false);
    expect(isISODate("11/06/2026")).toBe(false);
    expect(isISODate("")).toBe(false);
  });

  it("computes today in Manila, not UTC", () => {
    // 16:30 UTC on Nov 5 is 00:30 on Nov 6 in Manila (UTC+8).
    expect(todayISO("Asia/Manila", new Date("2026-11-05T16:30:00Z"))).toBe("2026-11-06");
    expect(todayISO("UTC", new Date("2026-11-05T16:30:00Z"))).toBe("2026-11-05");
  });

  it("formats dates for people", () => {
    expect(formatDate("2026-11-06")).toBe("Nov 6, 2026");
    expect(formatPeriod("2026-11")).toBe("November 2026");
    expect(formatTimestamp("2026-11-06 07:15:00", "Asia/Manila")).toMatch(/Nov 6, 2026.*3:15/);
    expect(relativeDays(0)).toBe("today");
    expect(relativeDays(1)).toBe("tomorrow");
    expect(relativeDays(4)).toBe("in 4 days");
    expect(relativeDays(-3)).toBe("3 days ago");
  });
});
