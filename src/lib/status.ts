/** House status: the single source of truth for the public label. */
export const HOUSE_STATUSES = ["vacant", "occupied", "under_repair"] as const;
export type HouseStatus = (typeof HOUSE_STATUSES)[number];

/** Label used inside the owner dashboard. */
export const houseStatusLabel: Record<HouseStatus, string> = {
  vacant: "Vacant",
  occupied: "Occupied",
  under_repair: "Under repair",
};

export type PublicStatus = {
  label: "Available" | "Occupied" | "Available soon";
  tone: "available" | "occupied" | "soon";
};

/** What visitors see on the public website. */
export function publicStatus(status: HouseStatus): PublicStatus {
  switch (status) {
    case "vacant":
      return { label: "Available", tone: "available" };
    case "occupied":
      return { label: "Occupied", tone: "occupied" };
    case "under_repair":
      return { label: "Available soon", tone: "soon" };
  }
}

export function isHouseStatus(value: unknown): value is HouseStatus {
  return typeof value === "string" && (HOUSE_STATUSES as readonly string[]).includes(value);
}
