/**
 * Creates a Drizzle database connection.
 * Local: a SQLite file (default data/rental.db). Online: a Turso URL + auth token.
 * No `server-only` here so scripts and tests can use it too; the app imports `@/db`.
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const DEFAULT_DATABASE_URL = "file:data/rental.db";

export function databaseUrl(): string {
  return process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
}

export function createDatabase(url: string = databaseUrl(), authToken = process.env.DATABASE_AUTH_TOKEN) {
  const client = createClient({ url, authToken: authToken || undefined });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabase>;
