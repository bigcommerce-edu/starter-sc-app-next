import { cache } from "react";
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

// Cached by React's per-request memoization so every call within a request
// shares one instance (and, for SqliteCredentialsStore, one open DB
// connection) rather than reopening the file per call — same rationale as
// getCachedRestApiClient in bc-api-client/get-rest-api-client.ts.
const getCachedCredentialsStore = cache((driver: CredentialsStoreDriver): CredentialsStore => {
  switch (driver) {
    case "SQLITE":
      return new SqliteCredentialsStore();
  }
});

// Selects the CredentialsStore implementation to use, based on
// CREDENTIALS_STORE_DRIVER. SQLite is the only driver today (suitable for
// local development and single-instance use); a future multi-instance
// deployment will add a driver here (e.g. Postgres/D1) without callers
// needing to change.
export function getCredentialsStore(): CredentialsStore {
  return getCachedCredentialsStore(getConfiguredDriver());
}
