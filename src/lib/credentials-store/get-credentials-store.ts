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

// SQLite is for local development and single-instance use; POSTGRES (see
// postgres-driver/) is for any real multi-instance deployment (e.g. Vercel
// + Neon) — a shared remote database every instance can see, rather than a
// local file.
function getConfiguredCredentialsStore(): CredentialsStore {
  switch (getConfiguredDriver()) {
    case "SQLITE":
      return new SqliteCredentialsStore();
    case "POSTGRES":
      return new PostgresCredentialsStore();
  }
}

// Not memoized per request yet — the caching enhancement wraps this in
// cache(), renaming it to getCachedCredentialsStore.
export function getCredentialsStore(): CredentialsStore {
  return getConfiguredCredentialsStore();
}
