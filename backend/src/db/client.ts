// ============================================================
// Neon DB Client — uses @neondatabase/serverless
// Single connection pool, shared across the app
// DATABASE_URL is optional in Phase 1 dev mode — persistence
// is silently skipped if not configured.
// ============================================================

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type DB = ReturnType<typeof drizzle>;

let db: DB | null = null;

if (process.env.DATABASE_URL) {
  const sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
} else {
  console.warn("[db] DATABASE_URL not set — persistence disabled. Set it to enable saved scans.");
}

export { db };

