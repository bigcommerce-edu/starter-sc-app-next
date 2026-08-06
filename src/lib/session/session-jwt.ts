export function signSession(): void {
  // TODO: Implement signSession
  //  - Sign a SessionPayload as a short-lived JWT (SESSION_SECRET, distinct
  //    from BIGCOMMERCE_CLIENT_SECRET)
}

export function verifySession(): void {
  // TODO: Implement verifySession
  //  - Verify a session JWT with the same SESSION_SECRET
  //  - Also throw if it's past a maximum age since payload.issuedAt,
  //    independent of the JWT's own short expiration
}
