// sub (load/uninstall/remove_user) and context (auth) are both formatted as
// "stores/{hash}" — this is the one place that split happens.
export function parseStoreHash(storesSlashHash: string): string {
  const [, storeHash] = storesSlashHash.split("/");

  return storeHash;
}

export function verifySignedPayload(): void {
  // TODO: Implement verifySignedPayload
  //  - Define a zod schema for the claims this app reads (sub, user, owner,
  //    url) and export SignedPayload as its inferred type
  //  - Verify signedPayloadJwt with jose's jwtVerify, using
  //    BIGCOMMERCE_CLIENT_SECRET as the key and BIGCOMMERCE_CLIENT_ID as the
  //    audience
}
