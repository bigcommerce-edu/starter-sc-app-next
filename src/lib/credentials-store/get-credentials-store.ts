// The Postgres and D1 drivers are imported from their *-driver-loader.ts
// files, not directly from their implementations — see those files' own
// comments for why (a build-time alias keeps each driver's untransportable
// dependency out of builds that don't use it: `pg` for Postgres,
// @opennextjs/cloudflare for D1).
import { cache } from "react";
import { D1CredentialsStore } from "@/lib/credentials-store/d1-driver-loader";
import { PostgresCredentialsStore } from "@/lib/credentials-store/postgres-driver-loader";
import { SqliteCredentialsStore } from "@/lib/credentials-store/sqlite-driver/sqlite-credentials-store";
import { CredentialsStore, CredentialsStoreDriver } from "@/lib/credentials-store/types";

const VALID_DRIVERS: CredentialsStoreDriver[] = ["SQLITE", "POSTGRES", "D1"];
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
    case "D1":
      return new D1CredentialsStore();
  }
});

// Selects the CredentialsStore implementation to use, based on
// CREDENTIALS_STORE_DRIVER. SQLite is for local development and
// single-instance use; the other two are for real multi-instance
// deployments, where every instance needs one shared remote database rather
// than a local file, and the choice between them is a hosting decision:
// POSTGRES (see postgres-driver/) for a Node host such as Vercel + Neon, D1
// (see d1-driver/) for Cloudflare Workers, where SQLite has no persistent
// file to write and `pg` cannot be bundled at all.
export function getCredentialsStore(): CredentialsStore {
  return getCachedCredentialsStore(getConfiguredDriver());
}
