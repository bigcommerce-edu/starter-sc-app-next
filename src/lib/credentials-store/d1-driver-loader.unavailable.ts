import { UnavailableCredentialsStore } from "@/lib/credentials-store/unavailable-credentials-store";

// Swapped in for d1-driver-loader.ts by next.config.ts's
// turbopack.resolveAlias whenever CREDENTIALS_STORE_DRIVER isn't "D1",
// keeping @opennextjs/cloudflare's context lookup out of the compiled output
// on targets that would never select it anyway.
//
// There's nothing driver-specific to implement — every driver satisfies the
// same CredentialsStore interface, so the throwing behavior is shared (see
// unavailable-credentials-store.ts). This adds only the driver name for the
// error message, under the class name get-credentials-store.ts imports from
// this specifier.
export class D1CredentialsStore extends UnavailableCredentialsStore {
  constructor() {
    super("D1");
  }
}
