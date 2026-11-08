/**
 * `npm run owner:add -- someone@example.com "Their Name"`
 * Creates an owner login with a new random password, or resets the password
 * (and signs out every device) if that email already has a login.
 */
import { createDatabase } from "../src/db/client";
import { generatePassword } from "../src/lib/password";
import { migrateDatabase, upsertOwner } from "../seed";
import { loadEnv } from "./env";

async function main() {
  const [email, name] = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  if (!email || !email.includes("@")) {
    console.log('Usage: npm run owner:add -- someone@example.com "Their Name"');
    process.exit(1);
  }
  loadEnv();
  const db = createDatabase();
  await migrateDatabase(db);
  const password = generatePassword();
  const result = await upsertOwner(db, { email, name: name ?? "Owner", password });
  console.log(`${result === "created" ? "Created" : "Reset password for"} ${email.toLowerCase()}`);
  console.log(`Password (shown once, write it down): ${password}`);
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
