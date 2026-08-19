// Generic path builder: if a store hash is available, scopes the path under
// a literal /store/<hash> segment (matching app/store/[storeHash]);
// otherwise returns the path unchanged, matching the root-level route
// aliases used in MOCK/STATIC dev. The literal "/store" prefix is what lets
// proxy.ts's matcher unambiguously target store-scoped routes — see
// proxy.ts.
//
// Deliberately relative, since every current caller renders this as an
// in-app href for client-side navigation. Callers needing a fully-qualified
// URL (e.g. a redirect Location header) should use getAbsoluteAppUrl instead.
export function getAppUrl(storeHash: string | undefined, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!storeHash) {
    return normalizedPath;
  }

  return `/store/${storeHash}${normalizedPath}`;
}

// Absolute counterpart to getAppUrl, anchored to APP_ORIGIN rather than
// whatever host/scheme the current request happened to arrive on — behind a
// proxy, request.url isn't guaranteed to reflect the public origin actually
// used, so resolving a redirect against it can silently produce the wrong
// host or scheme.
export function getAbsoluteAppUrl(storeHash: string | undefined, path: string): string {
  const appOrigin = process.env.APP_ORIGIN;

  if (!appOrigin) {
    throw new Error("APP_ORIGIN must be set to build an absolute app URL.");
  }

  return new URL(getAppUrl(storeHash, path), appOrigin).toString();
}
