import "server-only";
import { createDatabase, type Database } from "./client";

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { __rentalDb?: Database };

export const db: Database = globalForDb.__rentalDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__rentalDb = db;
}
