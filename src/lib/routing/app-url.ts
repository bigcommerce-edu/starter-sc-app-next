// Generic path builder: if a store hash is available, scope the path under
// it (matching the [storeHash] route segment); otherwise return the path
// unchanged (matching the root-level route aliases used in MOCK/STATIC dev).
// Callers don't need to know about DataMode — see assertStoreHashForDataMode,
// which enforces that a storeHash is only ever missing when that's valid.
export function getAppUrl(storeHash: string | undefined, path: string): string {
  if (!storeHash) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `/${storeHash}${normalizedPath}`;
}
