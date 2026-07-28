import { cache } from "react";
// Imported from postgres-driver-loader.ts, not directly from
// postgres-driver/postgres-credentials-store.ts — see that file's own
// comment for why (a build-time alias keeps `pg` out of builds that don't
// use it).
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

// Selects the CredentialsStore implementation to use, based on
// CREDENTIALS_STORE_DRIVER. SQLite is for local development and
// single-instance use; POSTGRES (see postgres-driver/) is for any real
// multi-instance deployment (e.g. Vercel + Neon) — a shared remote database
// every instance can see, rather than a local file.
export function getCredentialsStore(): CredentialsStore {
  return getCachedCredentialsStore(getConfiguredDriver());
}
