import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1CredentialsStore } from "@/lib/credentials-store/d1-driver/d1-credentials-store";
import { CredentialsStore } from "@/lib/credentials-store/types";

// Must match the binding declared in wrangler.jsonc's d1_databases. Unlike the
// OpenNext cache bindings, this name is the app's own.
const D1_BINDING_NAME = "CREDENTIALS_D1";

// Builds a D1CredentialsStore around the platform's D1 binding.
//
// The driver itself (d1-driver/) is portable; only acquiring the binding is
// platform-specific, so that step is isolated in this module. A D1 binding
// only exists on Cloudflare Workers, so this is the file that differs between
// a Cloudflare deployment and any other target.
export function createD1CredentialsStore(): CredentialsStore {
  const database = getCloudflareContext().env[D1_BINDING_NAME];

  if (!database) {
    throw new Error(
      `The ${D1_BINDING_NAME} binding is not available. It must be declared in wrangler.jsonc's ` +
        "d1_databases to use the D1 credentials store driver, and is only present when running on " +
        "Cloudflare Workers (`pnpm preview`/`pnpm deploy`), not under `next dev`.",
    );
  }

  return new D1CredentialsStore(database);
}
