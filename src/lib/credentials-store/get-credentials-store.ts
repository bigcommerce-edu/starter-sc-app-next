// Drivers with a target-specific dependency come from their
// *-driver-loader.ts file rather than directly from the implementation, so a
// build-time alias can swap in a stub — see those files.
import { cache } from "react";
import { PostgresCredentialsStore } from "@/lib/credentials-store/postgres-driver-loader";
import { SqliteCredentialsStore } from "@/lib/credentials-store/sqlite-driver/sqlite-credentials-store";
import { CredentialsStore, CredentialsStoreDriver } from "@/lib/credentials-store/types";

const VALID_DRIVERS: CredentialsStoreDriver[] = ["SQLITE", "POSTGRES"];
const DEFAULT_DRIVER: CredentialsStoreDriver = "SQLITE";

function getConfiguredDriver(): CredentialsStoreDriver {
  const configuredDriver = process.env.CREDENTIALS_STORE_DRIVER?.toUpperCase();

  return VALID_DRIVERS.includes(configuredDriver as CredentialsStoreDriver)
    ? (configuredDriver as CredentialsStoreDriver)
    : DEFAULT_DRIVER;
}

// Memoized per request so every call shares one instance (and, for
// SqliteCredentialsStore, one open DB connection).
const getCachedCredentialsStore = cache((driver: CredentialsStoreDriver): CredentialsStore => {
  switch (driver) {
    case "SQLITE":
      return new SqliteCredentialsStore();
    case "POSTGRES":
      return new PostgresCredentialsStore();
  }
});

// Selects the CredentialsStore implementation, based on
// CREDENTIALS_STORE_DRIVER. SQLITE is for local development and
// single-instance use; any other driver backs a real multi-instance
// deployment, where every instance needs one shared remote database rather
// than a local file, and the choice between them is a hosting decision —
// POSTGRES (see postgres-driver/) for a Node host such as Vercel + Neon.
export function getCredentialsStore(): CredentialsStore {
  return getCachedCredentialsStore(getConfiguredDriver());
}
