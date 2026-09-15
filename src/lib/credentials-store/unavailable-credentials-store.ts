import {
  CredentialsStore,
  StoreExtensionRecord,
  StoreRecord,
  StoreUserRecord,
  UserRecord,
} from "@/lib/credentials-store/types";

// Shared stand-in for any credentials-store driver compiled out of this build
// (see next.config.ts's turbopack.resolveAlias); each
// *-driver-loader.unavailable.ts subclasses it to supply the driver name.
//
// Every method throws rather than no-opping: reaching here means the
// build-time alias and the runtime driver selection have drifted, and a
// silent "no credentials found" would look like an uninstalled store and send
// a real install into a re-auth loop.
export class UnavailableCredentialsStore implements CredentialsStore {
  constructor(private readonly driverName: string) {}

  async setStore(_store: StoreRecord): Promise<void> {
    throw this.unavailableError();
  }

  async setUser(_user: UserRecord): Promise<void> {
    throw this.unavailableError();
  }

  async setStoreUser(_storeUser: StoreUserRecord): Promise<void> {
    throw this.unavailableError();
  }

  async getStoreToken(_storeHash: string): Promise<string | undefined> {
    throw this.unavailableError();
  }

  async setStoreExtension(_storeExtension: StoreExtensionRecord): Promise<void> {
    throw this.unavailableError();
  }

  async getStoreExtension(_storeHash: string): Promise<string | undefined> {
    throw this.unavailableError();
  }

  async isStoreUserLinked(_storeHash: string, _userId: number): Promise<boolean> {
    throw this.unavailableError();
  }

  async deleteStore(_storeHash: string): Promise<void> {
    throw this.unavailableError();
  }

  async deleteUser(_storeHash: string, _userId: number): Promise<void> {
    throw this.unavailableError();
  }

  private unavailableError(): Error {
    return new Error(
      `The ${this.driverName} credentials store driver is not available in this deployment ` +
        "target's build (see next.config.ts's turbopack.resolveAlias) — CREDENTIALS_STORE_DRIVER " +
        `must not be set to ${this.driverName} here.`,
    );
  }
}
