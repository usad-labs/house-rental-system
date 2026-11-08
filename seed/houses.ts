/**
 * Starting data for the 6 houses (SAMPLE: names, rents and photos are placeholders).
 * Replace with the real houses, then run `npm run db:reset`. Once the family uses the
 * dashboard, edit houses there instead (db:reset wipes everything).
 * Photo credits: docs/design/photo-credits.md
 */
import type { HouseStatus } from "../src/lib/status";

export type SeedHouse = {
  slug: string;
  name: string;
  type: string;
  publicLocation: string;
  /** Private: shown only in the dashboard. */
  fullAddress: string;
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  floorAreaSqm?: number;
  utilities: "own" | "shared";
  description: string;
  features: string[];
  terms: string;
  status: HouseStatus;
  photos: { url: string; alt: string }[];
};

const WM = "https://upload.wikimedia.org/wikipedia/commons/thumb/";
const UN = (id: string) => `https://images.unsplash.com/photo-${id}?w=1000&q=70`;
const interior = (name: string) => [
  { url: UN("1502672260266-1c1ef2d93688"), alt: `${name}: living room (sample photo)` },
  { url: UN("1505693416388-ac5ce068fe85"), alt: `${name}: bedroom (sample photo)` },
  { url: UN("1484154218962-a197022b5858"), alt: `${name}: kitchen (sample photo)` },
];
const photos = (name: string, front: string) => [{ url: WM + front, alt: `${name}: front (sample photo)` }, ...interior(name)];

const LOCATION = "Near Dasmariñas West NHS, Dasmariñas City";
const TERMS = "1 month advance + 1 month deposit.";
const BASE = ["Living room, kitchen and bathroom", "Motorcycle parking only"];
const OWN = "Own water and electric meter";
const SHARED = "Shared water and electricity";

export const seedHouses: SeedHouse[] = [
  {
    slug: "kamagong", name: "Kamagong House", type: "1-bedroom house", publicLocation: LOCATION,
    fullAddress: "Unit 5, 5A compound (sample)", monthlyRent: 3000, bedrooms: 1, bathrooms: 1, floorAreaSqm: 28, utilities: "own",
    description: "A clean, simple house for a small family. Has its own water and electric meter, so you pay only what you use.",
    features: [...BASE, OWN, "Small pets allowed"], terms: TERMS, status: "vacant",
    photos: photos("Kamagong House", "5/53/Small_House_in_the_Philippines_%2802-28-2021%29.jpg/960px-Small_House_in_the_Philippines_%2802-28-2021%29.jpg"),
  },
  {
    slug: "yakal", name: "Yakal House", type: "2-bedroom house (the bigger one)", publicLocation: LOCATION,
    fullAddress: "Unit 6, 5A compound (sample)", monthlyRent: 3000, bedrooms: 2, bathrooms: 1, floorAreaSqm: 40, utilities: "shared",
    description: "The biggest house in the compound, with two bedrooms. Good for a family with kids. Being repaired now and opening soon.",
    features: [...BASE, SHARED, "2 bedrooms"], terms: TERMS, status: "under_repair",
    photos: photos("Yakal House", "8/87/A_house_under_a_mango_tree_in_Talisay_City_of_Cebu.jpg/960px-A_house_under_a_mango_tree_in_Talisay_City_of_Cebu.jpg"),
  },
  {
    slug: "acacia", name: "Acacia House", type: "1-bedroom house", publicLocation: LOCATION,
    fullAddress: "Unit 1, 5A compound (sample)", monthlyRent: 2500, bedrooms: 1, bathrooms: 1, floorAreaSqm: 26, utilities: "own",
    description: "A simple one-floor house near the compound gate, with its own meters.",
    features: [...BASE, OWN], terms: TERMS, status: "occupied",
    photos: photos("Acacia House", "0/0a/Houses_in_Mandaue_City_%2803-07-2021%29.jpg/960px-Houses_in_Mandaue_City_%2803-07-2021%29.jpg"),
  },
  {
    slug: "narra", name: "Narra House", type: "1-bedroom house", publicLocation: LOCATION,
    fullAddress: "Unit 2, 5A compound (sample)", monthlyRent: 2500, bedrooms: 1, bathrooms: 1, floorAreaSqm: 26, utilities: "shared",
    description: "A budget-friendly one-floor house. Water and electricity are shared and split fairly.",
    features: [...BASE, SHARED], terms: TERMS, status: "occupied",
    photos: photos("Narra House", "4/45/1439Palumlum%2C_Alfonso%2C_Cavite_20.jpg/960px-1439Palumlum%2C_Alfonso%2C_Cavite_20.jpg"),
  },
  {
    slug: "molave", name: "Molave House", type: "1-bedroom house", publicLocation: LOCATION,
    fullAddress: "Unit 3, 5A compound (sample)", monthlyRent: 2800, bedrooms: 1, bathrooms: 1, floorAreaSqm: 28, utilities: "own",
    description: "A quiet one-floor house at the back of the compound, with its own meters.",
    features: [...BASE, OWN], terms: TERMS, status: "occupied",
    photos: photos("Molave House", "6/63/Houses_in_Casili_Hills_%2804-24-2021%29.jpg/960px-Houses_in_Casili_Hills_%2804-24-2021%29.jpg"),
  },
  {
    slug: "banaba", name: "Banaba House", type: "1-bedroom house", publicLocation: LOCATION,
    fullAddress: "Unit 4, 5A compound (sample)", monthlyRent: 2500, bedrooms: 1, bathrooms: 1, floorAreaSqm: 26, utilities: "shared",
    description: "A cozy one-floor house with a small front area for plants.",
    features: [...BASE, SHARED], terms: TERMS, status: "occupied",
    photos: photos("Banaba House", "2/2c/My_Nice_house_for_the_weekend%2C_Dive_Solana%2C_Mabini_Batangas_-_panoramio.jpg/960px-My_Nice_house_for_the_weekend%2C_Dive_Solana%2C_Mabini_Batangas_-_panoramio.jpg"),
  },
];
