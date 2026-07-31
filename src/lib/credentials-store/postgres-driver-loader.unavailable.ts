import {
  CredentialsStore,
  StoreExtensionRecord,
  StoreRecord,
  StoreUserRecord,
  UserRecord,
} from "@/lib/credentials-store/types";

// Swapped in for postgres-driver-loader.ts by next.config.ts's
// turbopack.resolveAlias whenever CREDENTIALS_STORE_DRIVER isn't
// "POSTGRES", keeping `pg` out of the compiled output on targets that would
// never select it anyway. Every method throws rather than no-opping: if
// this is ever actually instantiated, the alias and the runtime driver
// selection have drifted out of sync, and that should fail loudly.
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
