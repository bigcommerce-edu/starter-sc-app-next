import { CredentialsStore } from "@/lib/credentials-store/types";

// Builds a D1CredentialsStore around the platform's D1 binding.
//
// The driver itself (d1-driver/) is portable; only acquiring the binding is
// platform-specific, so that step is isolated in this module. A D1 binding
// only exists on Cloudflare Workers, so this is the file that differs between
// a Cloudflare deployment and any other target.
export function createD1CredentialsStore(): CredentialsStore {
  throw new Error(
    "The D1 credentials store driver requires a Cloudflare D1 binding, which is only available " +
      "when running on Cloudflare Workers. Set CREDENTIALS_STORE_DRIVER to SQLITE or POSTGRES, " +
      "or deploy this app to Cloudflare Workers.",
  );
}
