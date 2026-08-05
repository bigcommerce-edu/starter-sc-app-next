import { SqliteCredentialsStore } from "@/lib/credentials-store/sqlite-driver/sqlite-credentials-store";
import { CredentialsStore, CredentialsStoreDriver } from "@/lib/credentials-store/types";

const VALID_DRIVERS: CredentialsStoreDriver[] = ["SQLITE"];
const DEFAULT_DRIVER: CredentialsStoreDriver = "SQLITE";

function getConfiguredDriver(): CredentialsStoreDriver {
  const configuredDriver = process.env.CREDENTIALS_STORE_DRIVER?.toUpperCase();

  return VALID_DRIVERS.includes(configuredDriver as CredentialsStoreDriver)
    ? (configuredDriver as CredentialsStoreDriver)
    : DEFAULT_DRIVER;
}

// No POSTGRES case yet — that's Lab 5.
function getConfiguredCredentialsStore(): CredentialsStore {
  switch (getConfiguredDriver()) {
    case "SQLITE":
    default:
      return new SqliteCredentialsStore();
  }
}

// Not memoized per request yet — the caching enhancement wraps this in
// cache(), renaming it to getCachedCredentialsStore.
export function getCredentialsStore(): CredentialsStore {
  return getConfiguredCredentialsStore();
}
