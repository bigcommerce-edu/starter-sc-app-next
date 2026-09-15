import { CredentialsStore } from "@/lib/credentials-store/types";

// Builds a D1CredentialsStore around the platform's D1 binding.
//
// The driver itself (d1-driver/) is portable and lives in the core app; only
// acquiring the binding is platform-specific, so that step is isolated here.
// This core version throws, because a D1 binding only exists on Cloudflare
// Workers — the deployment tooling for that target replaces this file with one
// that reads the binding off the Worker env and passes it to the driver.
//
// Kept as its own module so that replacement is a whole-file swap rather than
// an edit inside get-credentials-store.ts.
export function createD1CredentialsStore(): CredentialsStore {
  throw new Error(
    "The D1 credentials store driver requires a Cloudflare D1 binding, which is only available " +
      "when running on Cloudflare Workers. Scaffold this app for Cloudflare, or set " +
      "CREDENTIALS_STORE_DRIVER to SQLITE or POSTGRES.",
  );
}
