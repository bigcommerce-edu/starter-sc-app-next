import { Pool } from "pg";

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set to use the POSTGRES credentials store driver.");
  }

  return connectionString;
}

// One pool per warm serverless instance (module-level singleton, not
// per-request/per-call) — the standard node-postgres pattern for
// long-lived-process reuse across invocations. DATABASE_URL is Neon's
// pooled (PgBouncer, transaction-mode) endpoint, so this pool's own `max`
// only bounds how many concurrent queries *this instance* can have in
// flight; it does not need to be 1 — PgBouncer already does the real
// fan-in down to Postgres's actual backend connections. Left at
// node-postgres's default `max` (10), which comfortably covers one
// instance's concurrent requests without over-provisioning.
let pool: Pool | undefined;

// Schema creation/changes are handled entirely by node-pg-migrate (see
// migrations/ and package.json's db:migrate script), run once against the
// database before the app is deployed — not by this app at request time. So
// this function does nothing beyond opening the pool: no bootstrap DDL, no
// existence check. Every CredentialsStore method calls this before querying
// and assumes the schema it needs already exists.
export function getPool(): Pool {
  pool ??= new Pool({ connectionString: getConnectionString() });

  return pool;
}
