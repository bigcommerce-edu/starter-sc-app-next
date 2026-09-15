import { getCloudflareContext } from "@opennextjs/cloudflare";

// Must match the binding in wrangler.jsonc's d1_databases. Unlike the OpenNext
// cache bindings, this name is the app's own.
const D1_BINDING_NAME = "CREDENTIALS_D1";

// A lookup, not a connection — a D1Database binding arrives ready to use, so
// there's nothing to pool or cache (caching it would risk holding a handle
// from a previous request's env).
//
// The generated CloudflareEnv types this binding as non-optional, but it only
// exists when running on Workers, so the check below is a real runtime guard.
//
// Schema is applied by `wrangler d1 migrations apply` (see migrations/) before
// deploy; every method here assumes it exists.
export function getDatabase(): D1Database {
  // Synchronous form is safe: every caller is already inside a request.
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
