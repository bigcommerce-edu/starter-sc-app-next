#!/usr/bin/env node
// Runs node-pg-migrate against the POSTGRES credentials-store driver's
// migrations (see src/lib/credentials-store/postgres-driver/migrations/).
// Deliberately keyed only on DATABASE_URL_UNPOOLED/DATABASE_URL being set —
// not on DATA_MODE/CREDENTIALS_STORE_DRIVER — so this script has no
// knowledge of (or dependency on) this app's own mode concept. That keeps
// it a plain, reusable "migrate this Postgres database" script: anyone
// using a different driver (SQLite, or a future one) simply never sets
// either, and this script no-ops instead of failing their build. Every
// hosting provider's own build script (e.g. vercel-build in package.json)
// decides whether to call this at all.
//
// Uses DATABASE_URL_UNPOOLED (Neon's direct, non-PgBouncer connection)
// rather than DATABASE_URL (the pooled one every other query in this app
// uses) — see get-pool.ts's comment on why the app's own queries prefer the
// pooled endpoint; migrations are the opposite case: a one-off, run-to-completion
// DDL transaction is exactly the kind of session-level operation transaction-mode
// pooling can misbehave with, and there's no pooling benefit to lose for a
// command that runs once per deploy, not per request.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.log("[migrate] DATABASE_URL_UNPOOLED/DATABASE_URL not set — skipping Postgres migrations.");
  process.exit(0);
}

// Resolved via import.meta.resolve (Node's own module resolution) rather
// than executed by bare name ("node-pg-migrate") — a bare name only
// resolves because pnpm puts node_modules/.bin on PATH for `pnpm run`
// scripts specifically; invoking this file directly as `node
// scripts/postgres/migrate.mjs` has no such PATH entry, and execFileSync
// (unlike execSync) doesn't go through a shell, so it can't fall back to
// shell-level PATH/alias resolution either. This also sidesteps
// node_modules/.bin's shim being a POSIX shell script on Mac/Linux but a
// .cmd file on Windows (which execFileSync can't run without shell: true) —
// resolving straight to node-pg-migrate's own JS entry point and running it
// with `node` works identically on every platform, no shim involved.
const nodePgMigrateBin = fileURLToPath(import.meta.resolve("node-pg-migrate/bin/node-pg-migrate"));

execFileSync(
  process.execPath,
  [
    nodePgMigrateBin,
    "up",
    "--migrations-dir",
    "src/lib/credentials-store/postgres-driver/migrations",
    "--migration-file-language",
    "sql",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: connectionString },
  },
);
