/**
 * `npm run db:reset`: wipes all houses, tenants, payments, repairs, inquiries and
 * uploaded photos, then reloads the data in /seed. Owner logins are kept.
 * Add `-- --yes` to skip the confirmation question.
 */
import { readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { siteConfig } from "../src/config/site";
import { createDatabase } from "../src/db/client";
import { todayISO } from "../src/lib/dates";
import { clearBusinessData, migrateDatabase, seedSampleData } from "../seed";
import { loadEnv } from "./env";

async function confirm(): Promise<boolean> {
  if (process.argv.includes("--yes")) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    "This deletes ALL houses, tenants, payments, repairs, inquiries and uploaded photos, then reloads the seed data. Type 'reset' to continue: ",
  );
  rl.close();
  return answer.trim().toLowerCase() === "reset";
}

async function main() {
  loadEnv();
  if (!(await confirm())) {
    console.log("Cancelled. Nothing was changed.");
    return;
  }
  const db = createDatabase();
  await migrateDatabase(db);
  await clearBusinessData(db);

  const uploads = path.join("data", "uploads");
  try {
    for (const file of readdirSync(uploads)) rmSync(path.join(uploads, file), { force: true });
  } catch {
    // no uploads folder yet
  }

  await seedSampleData(db, todayISO(siteConfig.timeZone));
  console.log("Done: database reloaded from /seed.");
}

main().catch((error) => {
  console.error("Reset failed:", error);
  process.exit(1);
});
