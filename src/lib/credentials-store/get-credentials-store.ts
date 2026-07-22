import { cache } from "react";
// Imported from postgres-driver-loader.ts, not directly from
// postgres-driver/postgres-credentials-store.ts — next.config.ts's
// turbopack.resolveAlias swaps this specifier for a `pg`-free stub on builds
// where CREDENTIALS_STORE_DRIVER isn't "POSTGRES", so `pg` (which breaks
// bundling on some deployment targets, e.g. Cloudflare Workers) is never
// compiled in on a build that would never select this branch anyway. See
// postgres-driver-loader.ts's own comment.
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

// Cached by React's per-request memoization so every call within a request
// shares one instance (and, for SqliteCredentialsStore, one open DB
// connection) rather than reopening the file per call — same rationale as
// getCachedRestApiClient in bc-api-client/get-rest-api-client.ts.
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
