// sub (load/uninstall/remove_user) and context (auth) are both formatted as
// "stores/{hash}" — this is the one place that split happens.
export function parseStoreHash(storesSlashHash: string): string {
  const [, storeHash] = storesSlashHash.split("/");

  return storeHash;
}

export function verifySignedPayload(): void {
  // Not implemented yet
}
