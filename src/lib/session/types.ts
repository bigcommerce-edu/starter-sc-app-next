// The app's own session, minted after verifying BigCommerce's signed
// payload — carries identity only, never the store access token (that
// stays in CredentialsStore, looked up per-request by storeHash). A list
// of stores rather than a single one is what lets one admin be launched
// into multiple stores concurrently (e.g. separate browser tabs) under one
// cookie — the active store for a given request is resolved from the
// [storeHash] route segment and checked against this list, not read from it.
export interface SessionPayload {
  userId: number;
  authenticatedStores: string[];
}

export const SESSION_COOKIE_NAME = "bc_app_session";
