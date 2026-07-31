export type CredentialsStoreDriver = "SQLITE" | "POSTGRES";

// A store's OAuth grant. adminUserId is the id of the user who completed
// the install — every store has exactly one.
export interface StoreRecord {
  storeHash: string;
  accessToken: string;
  scope: string;
  adminUserId: number;
}

// A BigCommerce user, not scoped to a single store (linked to stores via
// StoreUserRecord). No username: it's not present on every payload that
// identifies a user, and nothing in this app reads it.
export interface UserRecord {
  userId: number;
  email: string;
}

// The join between a store and a user authorized to access it.
export interface StoreUserRecord {
  storeHash: string;
  userId: number;
}

// Links a store to the App Extension registered for it at install time.
// extensionId is BigCommerce's own opaque id, not something this app
// generates.
export interface StoreExtensionRecord {
  storeHash: string;
  extensionId: string;
}

// Generic persistence for per-store API credentials, implemented by one
// driver per backing DB (see sqlite-driver/ and postgres-driver/) — see
// docs/ARCHITECTURE.md for the full design (upsert semantics, the
// deleteStore/deleteUser cascades, and isStoreUserLinked's role in
// isAuthorizedForStore).
export interface CredentialsStore {
  setStore(store: StoreRecord): Promise<void>;
  setUser(user: UserRecord): Promise<void>;
  setStoreUser(storeUser: StoreUserRecord): Promise<void>;
  getStoreToken(storeHash: string): Promise<string | undefined>;
  setStoreExtension(storeExtension: StoreExtensionRecord): Promise<void>;
  getStoreExtension(storeHash: string): Promise<string | undefined>;
  isStoreUserLinked(storeHash: string, userId: number): Promise<boolean>;
  deleteStore(storeHash: string): Promise<void>;
  deleteUser(storeHash: string, userId: number): Promise<void>;
}
