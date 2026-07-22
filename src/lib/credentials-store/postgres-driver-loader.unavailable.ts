import {
  CredentialsStore,
  StoreExtensionRecord,
  StoreRecord,
  StoreUserRecord,
  UserRecord,
} from "@/lib/credentials-store/types";

// Swapped in for postgres-driver-loader.ts (see that file's own comment) by
// next.config.ts's turbopack.resolveAlias whenever CREDENTIALS_STORE_DRIVER
// isn't "POSTGRES" — the whole point is to keep `pg` (and everything it
// pulls in, including the pg-cloudflare optional dependency that breaks
// Cloudflare Workers builds) out of the compiled output entirely on
// deployment targets that were never going to select the Postgres driver at
// runtime anyway. Every method throws rather than silently no-opping: if
// this class is ever actually instantiated, get-credentials-store.ts's own
// CREDENTIALS_STORE_DRIVER check has a bug (the alias and the runtime driver
// selection have drifted out of sync), and that should fail loudly rather
// than pretend to work.
export class PostgresCredentialsStore implements CredentialsStore {
  async setStore(_store: StoreRecord): Promise<void> {
    throw unavailableError();
  }

  async setUser(_user: UserRecord): Promise<void> {
    throw unavailableError();
  }

  async setStoreUser(_storeUser: StoreUserRecord): Promise<void> {
    throw unavailableError();
  }

  async getStoreToken(_storeHash: string): Promise<string | undefined> {
    throw unavailableError();
  }

  async setStoreExtension(_storeExtension: StoreExtensionRecord): Promise<void> {
    throw unavailableError();
  }

  async getStoreExtension(_storeHash: string): Promise<string | undefined> {
    throw unavailableError();
  }

  async isStoreUserLinked(_storeHash: string, _userId: number): Promise<boolean> {
    throw unavailableError();
  }

  async deleteStore(_storeHash: string): Promise<void> {
    throw unavailableError();
  }

  async deleteUser(_storeHash: string, _userId: number): Promise<void> {
    throw unavailableError();
  }
}

function unavailableError(): Error {
  return new Error(
    "The POSTGRES credentials store driver is not available in this deployment target's build " +
      "(see next.config.ts's turbopack.resolveAlias) — CREDENTIALS_STORE_DRIVER must not be set " +
      "to POSTGRES here.",
  );
}
