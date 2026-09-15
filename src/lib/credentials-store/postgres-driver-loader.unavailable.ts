import { UnavailableCredentialsStore } from "@/lib/credentials-store/unavailable-credentials-store";

// Swapped in for postgres-driver-loader.ts by next.config.ts's
// turbopack.resolveAlias whenever CREDENTIALS_STORE_DRIVER isn't "POSTGRES",
// keeping `pg` out of the compiled output. Supplies the driver name for the
// error message, under the class name that specifier is imported by.
export class PostgresCredentialsStore extends UnavailableCredentialsStore {
  constructor() {
    super("POSTGRES");
  }
}
