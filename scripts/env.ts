/** Shared env handling for scripts: creates .env.local on first run and loads it. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { generatePassword } from "../src/lib/password";

export const ENV_FILE = ".env.local";

export function ensureEnvFile(): { created: boolean } {
  const isHosted = Boolean(process.env.VERCEL || process.env.CI);
  if (isHosted || existsSync(ENV_FILE)) return { created: false };

  const template = readFileSync(".env.example", "utf8");
  const content = template.replace(/^SEED_OWNER_PASSWORD=.*$/m, `SEED_OWNER_PASSWORD=${generatePassword()}`);
  writeFileSync(ENV_FILE, content);
  return { created: true };
}

export function loadEnv() {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
}
