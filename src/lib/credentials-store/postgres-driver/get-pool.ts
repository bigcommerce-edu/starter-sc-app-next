import { Pool } from "pg";
import { logError } from "@/lib/errors/logger";

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set to use the POSTGRES credentials store driver.");
  }

  return connectionString;
}

// node-postgres's own default (10) is only safe to leave alone when
// DATABASE_URL is a pooled endpoint (e.g. Neon's PgBouncer, transaction-mode
// connection) — there, this pool's own `max` just bounds how many
// concurrent queries *this instance* can have in flight, since PgBouncer
// does the real fan-in down to Postgres's actual backend connections. This
// driver also works against a plain, unpooled Postgres server (see
// postgres-credentials-store.ts's module comment) — there, `max` connections
// are opened directly against Postgres's own connection limit (~100 by
// default) *per warm serverless instance*, and a handful of concurrently
// warm instances at the default max: 10 each can exhaust that limit under
// fan-out. DATABASE_POOL_MAX lets a deployment against a non-pooled server
// turn this down (or a pooled one turn it up) without needing a code change.
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

// Schema creation/changes are handled entirely by node-pg-migrate (see
// migrations/ and package.json's db:migrate script), run once against the
// database before the app is deployed — not by this app at request time. So
// this function does nothing beyond opening the pool: no bootstrap DDL, no
// existence check. Every CredentialsStore method calls this before querying
// and assumes the schema it needs already exists.
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: getConnectionString(), max: getPoolMax() });

    // Pool is an EventEmitter, and node-postgres emits "error" on it
    // whenever an idle client's backend connection dies server-side (e.g.
    // Neon aggressively terminates idle connections on scale-to-zero) — an
    // "error" event with no listener crashes the Node process, per
    // EventEmitter's own default behavior. This doesn't need to do anything
    // beyond existing: an idle client dying is expected and recoverable
    // (node-postgres removes it from the pool and opens a new one on the
    // next query), so logging is enough to make the failure visible without
    // treating it as fatal.
    pool.on("error", (error) => {
      logError("Postgres pool: unexpected error on idle client", error);
    });
  }

  return pool;
}
