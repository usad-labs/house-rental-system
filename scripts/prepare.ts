/**
 * Runs automatically before `npm run dev` and `npm run build`:
 *   1. creates .env.local (with a random owner password) if it doesn't exist
 *   2. creates the local data folders
 *   3. applies database migrations
 *   4. loads the sample data if the database is empty (skip with SEED_SAMPLE_DATA=false)
 *   5. creates the first owner login if it doesn't exist
 */
import { mkdirSync } from "node:fs";
import { siteConfig } from "../src/config/site";
import { createDatabase } from "../src/db/client";
import { houses } from "../src/db/schema";
import { todayISO } from "../src/lib/dates";
import { ensureOwner, migrateDatabase, seedSampleData } from "../seed";
import { ensureEnvFile, ENV_FILE, loadEnv } from "./env";

async function main() {
  const { created } = ensureEnvFile();
  if (created) console.log(`• Created ${ENV_FILE} with a new owner password.`);
  loadEnv();

  mkdirSync("data/uploads", { recursive: true });

  const db = createDatabase();
  await migrateDatabase(db);

  const houseCount = await db.$count(houses);
  if (houseCount === 0 && process.env.SEED_SAMPLE_DATA !== "false") {
    await seedSampleData(db, todayISO(siteConfig.timeZone));
    console.log("• Loaded sample data (6 houses, tenants, payments, repairs, inquiries).");
  }

  const email = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;
  if (email && password) {
    const ownerCreated = await ensureOwner(db, {
      email,
      name: process.env.SEED_OWNER_NAME || "Owner",
      password,
    });
    if (ownerCreated) console.log(`• Owner login created for ${email} (password: see ${ENV_FILE}).`);
  }

  console.log(`• Database ready. Website: http://localhost:3000  ·  Dashboard: http://localhost:3000/login`);
}

main().catch((error) => {
  console.error("Setup failed:", error);
  process.exit(1);
});
