export function proxy(): void {
  // TODO: Implement the primary authorization gate
  //  - Only applies in MULTITENANT mode
  //  - Verify the session cookie's JWT signature and its authenticatedStores
  //    claim against the URL's storeHash; redirect to /unauthorized on
  //    failure
  //  - On success, slide the cookie forward with a fresh TTL, preserving
  //    issuedAt unchanged (pass the same verified session back into
  //    signSession)
}
