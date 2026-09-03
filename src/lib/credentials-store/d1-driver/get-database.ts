import { getCloudflareContext } from "@opennextjs/cloudflare";

// The binding name declared in wrangler.jsonc's d1_databases. Unlike the
// OpenNext cache bindings (NEXT_TAG_CACHE_D1 and friends), this one is read
// only by this app, so the name is ours to choose — it just has to match
// wrangler.jsonc.
const D1_BINDING_NAME = "CREDENTIALS_D1";

// There is no pool and no connection to open: a D1Database binding is handed
// to the Worker already usable, so this is a lookup rather than a
// constructor. That's the whole reason there's no D1 counterpart to
// postgres-driver/get-pool.ts's module-level singleton — nothing to reuse
// across invocations, and caching the binding would risk holding a handle
// from a previous request's env.
//
// Kept as its own module anyway to match the Postgres driver's shape, and
// because it's the one place that has to reconcile two type surfaces: the
// generated CloudflareEnv (cloudflare-env.d.ts) types this binding as
// non-optional, but it only exists when the app actually runs on Workers, so
// the check below is a real runtime guard rather than a type formality.
//
// Schema creation/changes are handled entirely by
// `wrangler d1 migrations apply` (see migrations/), run once before the app
// is deployed — every CredentialsStore method assumes the schema exists.
// This deliberately does NOT mirror sqlite-driver's run-schema-on-open
// approach: that's safe only for a local file with no concurrent,
// independently-deployed writers, which is the opposite of D1.
export function getDatabase(): D1Database {
  // Synchronous form: every caller is already inside a request, where
  // OpenNext has populated the context. The async form exists for code that
  // runs outside a request (e.g. next.config.ts), which this is not.
  const database = getCloudflareContext().env[D1_BINDING_NAME];

  if (!database) {
    throw new Error(
      `The ${D1_BINDING_NAME} binding is not available. It must be declared in wrangler.jsonc's ` +
        "d1_databases to use the D1 credentials store driver, and is only present when running on " +
        "Cloudflare Workers (`pnpm preview`/`pnpm deploy`), not under `next dev`.",
    );
  }

  return database;
}
