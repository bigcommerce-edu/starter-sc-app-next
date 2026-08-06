import { SqliteCredentialsStore } from "@/lib/credentials-store/sqlite-driver/sqlite-credentials-store";
import { CredentialsStore, CredentialsStoreDriver } from "@/lib/credentials-store/types";

// TODO: Add POSTGRES to valid drivers
const VALID_DRIVERS: CredentialsStoreDriver[] = ["SQLITE"];
const DEFAULT_DRIVER: CredentialsStoreDriver = "SQLITE";

function getConfiguredDriver(): CredentialsStoreDriver {
  const configuredDriver = process.env.CREDENTIALS_STORE_DRIVER?.toUpperCase();

  return VALID_DRIVERS.includes(configuredDriver as CredentialsStoreDriver)
    ? (configuredDriver as CredentialsStoreDriver)
    : DEFAULT_DRIVER;
}

function getConfiguredCredentialsStore(): CredentialsStore {
  switch (getConfiguredDriver()) {
    case "SQLITE":
    default:
      return new SqliteCredentialsStore();
    // TODO: Add the POSTGRES case
    //  - Return a PostgresCredentialsStore (imported from
    //    postgres-driver-loader.ts, never the real driver directly)
  }
}

// Not memoized per request yet — the caching enhancement wraps this in
// cache(), renaming it to getCachedCredentialsStore.
export function getCredentialsStore(): CredentialsStore {
  return getConfiguredCredentialsStore();
}
