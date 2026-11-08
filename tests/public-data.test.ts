// Privacy rule (spec §5.1): public listings never carry tenant, payment or address data.
import { expect, test } from "vitest";
import { createDatabase } from "@/db/client";
import { selectPublicHouses } from "@/server/public-queries";
import { migrateDatabase, seedSampleData } from "../seed";

test("public house list has only listing fields and no private data", async () => {
  const db = createDatabase("file::memory:");
  await migrateDatabase(db);
  await seedSampleData(db, "2026-11-08");

  const houses = await selectPublicHouses(db);
  expect(houses.length).toBeGreaterThan(0);
  const allowed = ["slug", "name", "type", "publicLocation", "monthlyRent", "bedrooms", "utilities", "status", "coverUrl"];
  for (const h of houses) expect(Object.keys(h).sort()).toEqual([...allowed].sort());

  // Each house gets its own cover photo (guards against an uncorrelated subquery).
  expect(new Set(houses.map((h) => h.coverUrl)).size).toBe(houses.length);

  const text = JSON.stringify(houses);
  expect(text).not.toMatch(/compound \(sample\)/); // fullAddress
  expect(text).not.toMatch(/Mendoza|Garcia|Villanueva|Dela Rosa/); // sample tenant names
});
