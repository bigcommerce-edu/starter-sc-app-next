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

// SameSite=None + Secure + Partitioned (CHIPS) are all required for this
// cookie to work at all inside the BigCommerce control panel's cross-origin
// iframe. httpOnly keeps the session JWT (identity only, never the store
// access token) out of reach of any client-side script. Shared between
// session-cookie.ts (Server Component/Action reads and writes, via
// next/headers's cookies()) and proxy.ts (writes via NextResponse.cookies)
// — two different cookie-store APIs, but both accept this same options
// shape for .set(), so there's no reason for the actual values to be
// defined twice and risk drifting apart.
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  partitioned: true,
  path: "/",
};
