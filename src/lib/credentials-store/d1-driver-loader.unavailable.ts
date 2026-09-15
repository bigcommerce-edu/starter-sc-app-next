import { UnavailableCredentialsStore } from "@/lib/credentials-store/unavailable-credentials-store";

// Swapped in for d1-driver-loader.ts by next.config.ts's
// turbopack.resolveAlias whenever CREDENTIALS_STORE_DRIVER isn't "D1",
// keeping @opennextjs/cloudflare out of the compiled output. Supplies the driver name for the
// error message, under the class name that specifier is imported by.
export class D1CredentialsStore extends UnavailableCredentialsStore {
  constructor() {
    super("D1");
  }
}
