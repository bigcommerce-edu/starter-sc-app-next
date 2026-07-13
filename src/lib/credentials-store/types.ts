export type CredentialsStoreDriver = "SQLITE";

// Generic persistence for per-store API credentials, implemented by one
// driver per backing DB (see sqlite-driver/ for the first one). Modeled on
// BcRestApiClient (see lib/bc-api-client/types.ts): a small interface named
// for what it stores rather than how, so a future Postgres/D1/etc. driver
// can implement it without changing callers.
//
// TODO: define the actual read/write methods this needs (e.g. get/put/delete
// a store's token) and any associated record types, once the schema this
// layer persists is settled.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CredentialsStore {}
