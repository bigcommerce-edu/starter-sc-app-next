// The app's own session, minted after verifying BigCommerce's signed
// payload — carries identity only, never the store access token. A list of
// stores rather than a single one is what lets one admin be launched into
// multiple stores concurrently under one cookie.
export interface SessionPayload {
  userId: number;
  authenticatedStores: string[];
}

export const SESSION_COOKIE_NAME = "bc_app_session";

// SameSite=None + Secure + Partitioned (CHIPS) are all required for this
// cookie to work inside the BigCommerce control panel's cross-origin iframe.
// httpOnly keeps the session JWT out of reach of client-side scripts. Shared
// between session-cookie.ts and proxy.ts, two different cookie-store APIs
// that both accept this same options shape.
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  partitioned: true,
  path: "/",
};
