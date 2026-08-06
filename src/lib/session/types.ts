// TODO: Implement SessionPayload
//  - { userId, authenticatedStores: string[], issuedAt } - carries identity
//    only, never a store access token
export type SessionPayload = object;

// TODO: Implement SESSION_COOKIE_NAME
export const SESSION_COOKIE_NAME = "";

// TODO: Implement SESSION_COOKIE_OPTIONS
//  - httpOnly/secure/sameSite=none/partitioned/path=/ - all required for
//    this cookie to work inside the BigCommerce control panel's
//    cross-origin iframe
export const SESSION_COOKIE_OPTIONS = {};
