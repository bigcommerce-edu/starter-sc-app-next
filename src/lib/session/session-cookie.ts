export function upsertSessionStore(): void {
  // TODO: Implement upsertSessionStore
  //  - Mints a new session for a user/storeHash, or idempotently appends
  //    storeHash to an existing same-user session, preserving issuedAt when
  //    appending
  //  - Wire this into install-store.ts and load-store.ts, which don't call
  //    it yet
}

export function removeSessionStore(): void {
  // TODO: Implement removeSessionStore
  //  - Drops one storeHash from the session's authenticatedStores list
}

export function readSession(): void {
  // TODO: Implement readSession
  //  - Reads and verifies the current session cookie, treating a missing
  //    cookie and a failed verification identically (both are just "not
  //    authenticated")
  //  - No cache() wrapper yet - that's the caching enhancement
}

export function clearSession(): void {
  // TODO: Implement clearSession
  //  - Deletes the session cookie outright, ending the session for every
  //    store it covered - unlike removeSessionStore, which drops a single
  //    stale store claim
  //  - The delete has to repeat the same attributes the cookie was written
  //    with, or the original can survive inside the control panel's
  //    cross-origin iframe
}
