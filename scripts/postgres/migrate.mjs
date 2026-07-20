#!/usr/bin/env node
// Runs node-pg-migrate against the POSTGRES credentials-store driver's
// migrations (see src/lib/credentials-store/postgres-driver/migrations/).
// Deliberately keyed only on DATABASE_URL_UNPOOLED being set — not on
// DATA_MODE/CREDENTIALS_STORE_DRIVER — so this script has no knowledge of
// (or dependency on) this app's own mode concept. That keeps it a plain,
// reusable "migrate this Postgres database" script: anyone using a
// different driver (SQLite, or a future one) simply never sets
// DATABASE_URL_UNPOOLED, and this script no-ops instead of failing their
// build. Every hosting provider's own build script (e.g.
// vercel-build in package.json) decides whether to call this at all.
//
// Uses DATABASE_URL_UNPOOLED (Neon's direct, non-PgBouncer connection)
// rather than DATABASE_URL (the pooled one every other query in this app
// uses) — see get-pool.ts's comment on why the app's own queries prefer the
// pooled endpoint; migrations are the opposite case: a one-off, run-to-completion
// DDL transaction is exactly the kind of session-level operation transaction-mode
// pooling can misbehave with, and there's no pooling benefit to lose for a
// command that runs once per deploy, not per request.
import { execFileSync } from "node:child_process";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.log("[migrate] DATABASE_URL_UNPOOLED/DATABASE_URL not set — skipping Postgres migrations.");
  process.exit(0);
}

execFileSync(
  "node-pg-migrate",
  ["up", "--migrations-dir", "src/lib/credentials-store/postgres-driver/migrations", "--migration-file-language", "sql"],
  {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: connectionString },
  },
);
