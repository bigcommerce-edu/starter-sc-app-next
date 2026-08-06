export const NOT_AUTHORIZED_FOR_STORE_MESSAGE = "Not authorized for this store.";

export function isAuthorizedForStore(): void {
  // TODO: Implement isAuthorizedForStore
  //  - MOCK/STATIC trivially pass (no real session/store concept)
  //  - MULTITENANT: check the session cookie's authenticatedStores claim,
  //    then confirm via isStoreUserLinked (the credentials store) and
  //    resolveApiToken that the link still actually exists
  //  - Call removeSessionStore on a confirmed-stale claim
}
