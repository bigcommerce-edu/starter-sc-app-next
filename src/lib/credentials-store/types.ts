export type CredentialsStoreDriver = "SQLITE";

// A store's OAuth grant, as returned by BigCommerce's token exchange (see
// lib/bc-auth/exchange-code-for-token.ts). adminUserId is the id of the user
// who completed the install — every store has exactly one.
export interface StoreRecord {
  storeHash: string;
  accessToken: string;
  scope: string;
  adminUserId: number;
}

// A BigCommerce user as identified by the JWT `user`/`owner` claims (see
// lib/bc-auth/verify-signed-payload.ts) or the OAuth token-exchange response
// (see lib/bc-auth/exchange-code-for-token.ts). Not scoped to a single store
// — the same user id can be linked to multiple stores via StoreUserRecord.
// No username: BigCommerce's token-exchange response includes one, but the
// /load JWT (fired for every already-authenticated launch, not just install)
// never does, and nothing in this app reads it — rather than store a field
// that's guaranteed incomplete for anyone who never went through /auth,
// email is the only identifying info kept.
export interface UserRecord {
  userId: number;
  email: string;
}

// The join between a store and a user authorized to access it.
export interface StoreUserRecord {
  storeHash: string;
  userId: number;
}

// Links a store to the App Extension registered for it at install time (see
// lib/gift-certs-manager/register-app-extension.ts). extensionId is
// BigCommerce's own opaque id for the App Extension, returned by the
// createAppExtension mutation — not something this app generates.
export interface StoreExtensionRecord {
  storeHash: string;
  extensionId: string;
}

// Generic persistence for per-store API credentials, implemented by one
// driver per backing DB (see sqlite-driver/ for the first one). Modeled on
// BcRestApiClient (see lib/bc-api-client/types.ts): a small interface named
// for what it stores rather than how, so a future Postgres/D1/etc. driver
// can implement it without changing callers.
//
// setStore/setUser/setStoreUser are all upserts, called from the /auth
// (install) callback — a store re-installing simply replaces its token/scope
// rather than erroring or duplicating rows. getStoreToken returns only the
// token (not the full StoreRecord), since that's the only thing any current
// caller needs, and it's the one read that has to decrypt.
//
// deleteStore encapsulates the full /uninstall cascade: the store, its
// store-user links, its extension link (if any), and any user left with no
// remaining store association. The extension link is dropped purely as
// local bookkeeping — BigCommerce confirmed App Extensions are
// automatically cleaned up on their side when the app is uninstalled, so
// this app never calls the deleteAppExtension mutation itself. deleteUser
// scopes to one store+user pair (the /remove_user callback's actual
// semantics — a user is removed from one store, not globally), and
// likewise drops the user row if that was their last association.
//
// setStoreExtension is an upsert (like setStore/setUser/setStoreUser), but
// register-app-extension.ts only ever calls it after a successful
// createAppExtension mutation — a failed registration should leave no row,
// not a partial one. getStoreExtension returns just the extensionId (not the
// full StoreExtensionRecord), mirroring getStoreToken, since that's the only
// thing AppExtensionStatusBanner's status check needs.
export interface CredentialsStore {
  setStore(store: StoreRecord): Promise<void>;
  setUser(user: UserRecord): Promise<void>;
  setStoreUser(storeUser: StoreUserRecord): Promise<void>;
  getStoreToken(storeHash: string): Promise<string | undefined>;
  setStoreExtension(storeExtension: StoreExtensionRecord): Promise<void>;
  getStoreExtension(storeHash: string): Promise<string | undefined>;
  deleteStore(storeHash: string): Promise<void>;
  deleteUser(storeHash: string, userId: number): Promise<void>;
}
