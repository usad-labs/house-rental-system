/**
 * SAMPLE tenants, rent payments, repairs and inquiries, built relative to "today"
 * so the dashboard always shows realistic reminders (one overdue, one due soon,
 * one lease ending soon). Delete or replace when loading real data.
 */
import { addDays, clampedDate, parseISODate, shiftMonth } from "../src/lib/dates";
import type { InquiryStatus, PaymentMethod, PreferredTime, RepairStatus, UtilityKind, UtilityPayer } from "../src/lib/options";

function monthsBefore(iso: string, months: number): string {
  const { y, m, d } = parseISODate(iso);
  const shifted = shiftMonth(y, m, -months);
  return clampedDate(shifted.y, shifted.m, d);
}

function monthsAfter(iso: string, months: number): string {
  return monthsBefore(iso, -months);
}

function dayOf(iso: string): number {
  return parseISODate(iso).d;
}

export type SampleTenant = {
  houseSlug: string;
  fullName: string;
  phone: string;
  email: string;
  moveInDate: string;
  dueDay: number;
  leaseEndDate: string | null;
  monthlyRent: number;
  depositAmount: number;
  notes: string;
  movedOutDate: string | null;
  paymentMethod: PaymentMethod;
  /** Amount paid on the most recent charge that is already due (default: paid in full). */
  lastDueChargePaid?: number;
};

export type SampleRepair = {
  houseSlug: string;
  title: string;
  details: string;
  reportedOn: string;
  status: RepairStatus;
  completedOn: string | null;
  cost: number | null;
  handledBy: string;
};

export type SampleInquiry = {
  houseSlug: string | null;
  name: string;
  phone: string;
  email: string;
  preferredDate: string | null;
  preferredTime: PreferredTime | null;
  message: string;
  status: InquiryStatus;
  ownerNote: string;
  /** UTC "YYYY-MM-DD HH:MM:SS" */
  createdAt: string;
};

export type SampleUtilityBill = {
  houseSlug: string;
  kind: UtilityKind;
  period: string;
  amount: number;
  dueDate: string;
  cutoffDate: string | null;
  paidOn: string | null;
  paidBy: UtilityPayer;
};

export function buildSampleActivity(today: string) {
  const day = (offset: number) => addDays(today, offset);

  const acaciaDue = day(-20);
  const narraDue = day(-8);
  const molaveDue = day(-2);
  const banabaDue = day(3);
  const kamagongMoveIn = monthsBefore(day(-40), 12);

  const tenants: SampleTenant[] = [
    {
      houseSlug: "acacia",
      fullName: "Liza Mendoza (sample)",
      phone: "0900 000 0001",
      email: "liza.sample@example.com",
      moveInDate: monthsBefore(acaciaDue, 10),
      dueDay: dayOf(acaciaDue),
      leaseEndDate: day(45),
      monthlyRent: 2500,
      depositAmount: 2500,
      notes: "Prefers GCash. Asked about renewing for another year.",
      movedOutDate: null,
      paymentMethod: "gcash",
    },
    {
      houseSlug: "narra",
      fullName: "Paolo Garcia (sample)",
      phone: "0900 000 0002",
      email: "",
      moveInDate: monthsBefore(narraDue, 14),
      dueDay: dayOf(narraDue),
      leaseEndDate: monthsAfter(narraDue, 10),
      monthlyRent: 2500,
      depositAmount: 2500,
      notes: "Pays in cash, usually in two parts.",
      movedOutDate: null,
      paymentMethod: "cash",
      lastDueChargePaid: 1000,
    },
    {
      houseSlug: "molave",
      fullName: "Grace Villanueva (sample)",
      phone: "0900 000 0003",
      email: "grace.sample@example.com",
      moveInDate: monthsBefore(molaveDue, 5),
      dueDay: dayOf(molaveDue),
      leaseEndDate: monthsAfter(molaveDue, 7),
      monthlyRent: 2800,
      depositAmount: 2800,
      notes: "",
      movedOutDate: null,
      paymentMethod: "bank",
    },
    {
      houseSlug: "banaba",
      fullName: "Ramon Dela Rosa (sample)",
      phone: "0900 000 0004",
      email: "",
      moveInDate: monthsBefore(banabaDue, 7),
      dueDay: dayOf(banabaDue),
      leaseEndDate: monthsAfter(banabaDue, 5),
      monthlyRent: 2500,
      depositAmount: 2500,
      notes: "Works night shift; text before visiting.",
      movedOutDate: null,
      paymentMethod: "gcash",
    },
    {
      houseSlug: "kamagong",
      fullName: "Jenny Ramos (sample)",
      phone: "0900 000 0005",
      email: "",
      moveInDate: kamagongMoveIn,
      dueDay: dayOf(kamagongMoveIn),
      leaseEndDate: monthsAfter(kamagongMoveIn, 12),
      monthlyRent: 3000,
      depositAmount: 3000,
      notes: "Moved out after her lease ended. Deposit returned.",
      movedOutDate: day(-35),
      paymentMethod: "cash",
    },
  ];

  const repairs: SampleRepair[] = [
    {
      houseSlug: "yakal",
      title: "Fix ceiling leak and repaint interior",
      details: "Leak above the 2nd-floor hallway after the last storm. Repainting all bedrooms while the house is empty.",
      reportedOn: day(-12),
      status: "in_progress",
      completedOn: null,
      cost: null,
      handledBy: "Mang Ben (contractor)",
    },
    {
      houseSlug: "banaba",
      title: "Front gate latch is sticking",
      details: "Tenant says the gate latch is hard to close at night.",
      reportedOn: day(-2),
      status: "open",
      completedOn: null,
      cost: null,
      handledBy: "",
    },
    {
      houseSlug: "kamagong",
      title: "Repaint after move-out",
      details: "Full interior repaint and minor wall patching before listing the house again.",
      reportedOn: day(-34),
      status: "done",
      completedOn: day(-20),
      cost: 6500,
      handledBy: "Mang Ben (contractor)",
    },
    {
      houseSlug: "acacia",
      title: "Aircon cleaning (2 units)",
      details: "Yearly cleaning of both bedroom aircons.",
      reportedOn: day(-30),
      status: "done",
      completedOn: day(-28),
      cost: 1600,
      handledBy: "Aircon technician",
    },
    {
      houseSlug: "narra",
      title: "Replace kitchen faucet",
      details: "Old faucet was leaking at the base.",
      reportedOn: day(-60),
      status: "done",
      completedOn: day(-58),
      cost: 850,
      handledBy: "Neighborhood plumber",
    },
  ];

  const inquiries: SampleInquiry[] = [
    {
      houseSlug: "kamagong",
      name: "Carla Bautista (sample)",
      phone: "0900 000 0101",
      email: "",
      preferredDate: day(2),
      preferredTime: "afternoon",
      message: "Hi! Is Kamagong House still available? We are 2 adults and 1 kid. Can we view it this weekend?",
      status: "new",
      ownerNote: "",
      createdAt: `${day(0)} 01:40:00`,
    },
    {
      houseSlug: "yakal",
      name: "Mark Tolentino (sample)",
      phone: "0900 000 0102",
      email: "mark.sample@example.com",
      preferredDate: null,
      preferredTime: null,
      message: "Hello, when will Yakal House be available? Looking for a 1-year lease for a family of 5.",
      status: "new",
      ownerNote: "",
      createdAt: `${day(-1)} 11:05:00`,
    },
    {
      houseSlug: null,
      name: "Joy Pascual (sample)",
      phone: "0900 000 0103",
      email: "joy.sample@example.com",
      preferredDate: null,
      preferredTime: null,
      message: "Do you allow small dogs in any of the houses?",
      status: "contacted",
      ownerNote: "Replied on Messenger: yes for Kamagong House (small pets).",
      createdAt: `${day(-4)} 06:30:00`,
    },
  ];

  // One paid bill each, one shared bill due soon (owner pays), one overdue tenant bill near cut-off.
  const period = today.slice(0, 7);
  const utilityBills: SampleUtilityBill[] = [
    { houseSlug: "acacia", kind: "electric", period, amount: 1240, dueDate: day(-6), cutoffDate: null, paidOn: day(-7), paidBy: "tenant" },
    { houseSlug: "molave", kind: "electric", period, amount: 1580, dueDate: day(-4), cutoffDate: null, paidOn: day(-5), paidBy: "tenant" },
    { houseSlug: "narra", kind: "electric", period, amount: 3120, dueDate: day(4), cutoffDate: day(11), paidOn: null, paidBy: "owner" },
    { houseSlug: "banaba", kind: "water", period, amount: 420, dueDate: day(-5), cutoffDate: day(2), paidOn: null, paidBy: "tenant" },
  ];

  return { tenants, repairs, inquiries, utilityBills };
}
