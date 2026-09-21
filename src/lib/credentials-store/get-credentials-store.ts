// Postgres comes from its *-driver-loader.ts file rather than directly from
// the implementation, so a build-time alias can swap in a stub. D1 is built by
// a factory for a different reason: its database handle is supplied by the
// platform. See both loader files.
import { cache } from "react";
import { createD1CredentialsStore } from "@/lib/credentials-store/d1-driver-loader";
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
      return createD1CredentialsStore();
  }
});

// Selects the CredentialsStore implementation, based on
// CREDENTIALS_STORE_DRIVER. SQLITE is for local development and
// single-instance use; the other two are for multi-instance deployments, and
// the choice between them is a hosting decision — POSTGRES for a Node host
// such as Vercel + Neon, D1 for Cloudflare Workers.
export function getCredentialsStore(): CredentialsStore {
  return getCachedCredentialsStore(getConfiguredDriver());
}
