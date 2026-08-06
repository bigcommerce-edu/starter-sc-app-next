import { Pool } from "pg";
import { logError } from "@/lib/errors/logger";

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set to use the POSTGRES credentials store driver.");
  }

  return connectionString;
}

// node-postgres's default (10) is only safe against a pooled endpoint (e.g.
// Neon's PgBouncer). Against a plain, unpooled Postgres server, `max`
// connections are opened directly per warm serverless instance, and a
// handful of concurrently warm instances can exhaust the server's own
// connection limit. DATABASE_POOL_MAX lets a deployment tune this without a
// code change.
function getPoolMax(): number | undefined {
  const configuredMax = process.env.DATABASE_POOL_MAX;

  if (!configuredMax) {
    return undefined;
  }

  const parsedMax = Number(configuredMax);

  if (!Number.isInteger(parsedMax) || parsedMax <= 0) {
    throw new Error(`DATABASE_POOL_MAX must be a positive integer, got "${configuredMax}".`);
  }

  return parsedMax;
}

// One pool per warm serverless instance (module-level singleton, not
// per-request/per-call) — the standard node-postgres pattern for
// long-lived-process reuse across invocations.
let pool: Pool | undefined;

// Schema creation/changes are handled entirely by node-pg-migrate, run once
// before the app is deployed — this function does nothing beyond opening
// the pool. Every CredentialsStore method assumes the schema already exists.
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: getConnectionString(), max: getPoolMax() });

    // node-postgres emits "error" whenever an idle client's connection dies
    // server-side (e.g. Neon terminating idle connections) — an unhandled
    // "error" event crashes the process, but this is expected/recoverable,
    // so logging is enough.
    pool.on("error", (error) => {
      logError("Postgres pool: unexpected error on idle client", error);
    });
  }

  return pool;
}
