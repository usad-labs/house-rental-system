/** Fixed choices used by forms, the database schema and labels. Safe to import anywhere. */

export const PAYMENT_METHODS = ["cash", "gcash", "bank", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const paymentMethodLabel: Record<PaymentMethod, string> = {
  cash: "Cash",
  gcash: "GCash",
  bank: "Bank transfer",
  other: "Other",
};

export const REPAIR_STATUSES = ["open", "in_progress", "done"] as const;
export type RepairStatus = (typeof REPAIR_STATUSES)[number];
export const repairStatusLabel: Record<RepairStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
};

export const INQUIRY_STATUSES = ["new", "contacted", "closed"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
export const inquiryStatusLabel: Record<InquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};

export const UTILITY_KINDS = ["electric", "water"] as const;
export type UtilityKind = (typeof UTILITY_KINDS)[number];
export const utilityKindLabel: Record<UtilityKind, string> = { electric: "Electricity", water: "Water" };

export const UTILITY_PAYERS = ["tenant", "owner"] as const;
export type UtilityPayer = (typeof UTILITY_PAYERS)[number];

export const CLAIM_METHODS = ["gcash", "cash"] as const;
export type ClaimMethod = (typeof CLAIM_METHODS)[number];
export const CLAIM_STATUSES = ["pending", "confirmed", "rejected"] as const;

export const PREFERRED_TIMES = ["morning", "afternoon", "evening"] as const;
export type PreferredTime = (typeof PREFERRED_TIMES)[number];
export const preferredTimeLabel: Record<PreferredTime, string> = {
  morning: "Morning (8 AM–12 NN)",
  afternoon: "Afternoon (12–5 PM)",
  evening: "Early evening (5–7 PM)",
};
