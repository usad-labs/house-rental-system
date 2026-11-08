/**
 * Date helpers that work on plain "YYYY-MM-DD" strings.
 *
 * Dates are stored and compared as ISO date strings (no time, no time zone),
 * so a due date never shifts by a day because of server time zones.
 * "Today" is computed in the business time zone (Asia/Manila by default).
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type YMD = { y: number; m: number; d: number };

export function parseISODate(iso: string): YMD {
  const match = ISO_DATE.exec(iso);
  if (!match) throw new Error(`Invalid date: "${iso}" (expected YYYY-MM-DD)`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) {
    throw new Error(`Invalid date: "${iso}"`);
  }
  return { y, m, d };
}

export function isISODate(value: string): boolean {
  try {
    parseISODate(value);
    return true;
  } catch {
    return false;
  }
}

export function toISODate(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Number of days in a month (m is 1-12). */
export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** The given day in the given month, clamped to the month's last day (e.g. 31 → Feb 28). */
export function clampedDate(y: number, m: number, day: number): string {
  return toISODate(y, m, Math.min(day, daysInMonth(y, m)));
}

/** Move a (year, month) pair by n months. */
export function shiftMonth(y: number, m: number, n: number): { y: number; m: number } {
  const index = y * 12 + (m - 1) + n;
  return { y: Math.floor(index / 12), m: (index % 12) + 1 };
}

function toUTCms(iso: string): number {
  const { y, m, d } = parseISODate(iso);
  return Date.UTC(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const date = new Date(toUTCms(iso) + days * 86_400_000);
  return toISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: string, to: string): number {
  return Math.round((toUTCms(to) - toUTCms(from)) / 86_400_000);
}

/** "YYYY-MM" for a date. */
export function monthPeriod(iso: string): string {
  return iso.slice(0, 7);
}

/** Today's date in the given IANA time zone, as YYYY-MM-DD. */
export function todayISO(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "Nov 6, 2026" */
export function formatDate(iso: string, locale = "en-PH"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(toUTCms(iso)));
}

/** "Nov 6" (no year) */
export function formatShortDate(iso: string, locale = "en-PH"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(toUTCms(iso)));
}

/** "November 2026" for a "YYYY-MM" period. */
export function formatPeriod(period: string, locale = "en-PH"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(new Date(toUTCms(`${period}-01`)));
}

/**
 * Format a UTC SQLite timestamp ("YYYY-MM-DD HH:MM:SS") in the business time zone,
 * e.g. "Nov 6, 2026, 3:15 PM".
 */
export function formatTimestamp(utc: string, timeZone: string, locale = "en-PH"): string {
  const date = new Date(`${utc.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return utc;
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** "in 3 days", "today", "2 days ago" */
export function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}
