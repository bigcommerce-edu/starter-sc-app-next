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
