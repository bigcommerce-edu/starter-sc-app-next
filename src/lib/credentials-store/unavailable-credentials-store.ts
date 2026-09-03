import {
  CredentialsStore,
  StoreExtensionRecord,
  StoreRecord,
  StoreUserRecord,
  UserRecord,
} from "@/lib/credentials-store/types";

// Stand-in for any credentials-store driver that was compiled out of this
// build, shared by every *-driver-loader.unavailable.ts (see next.config.ts's
// turbopack.resolveAlias for what does the swapping, and why each driver has
// a dependency that can't be bundled for the other's target).
//
// One implementation covers all of them because CredentialsStore is the only
// thing a driver has to satisfy — a stub has no driver-specific behavior to
// vary, just a name to report. Each *-driver-loader.unavailable.ts subclasses
// this to supply that name (and to export it under the class name its own
// loader specifier is imported by), so the error says which driver was asked
// for.
//
// Every method throws rather than no-opping: if this is ever actually
// instantiated, the build-time alias and the runtime driver selection have
// drifted out of sync, and that should fail loudly rather than silently
// return "no credentials found" — which reads as "this store isn't
// installed" and would send a real install into a confusing re-auth loop.
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
