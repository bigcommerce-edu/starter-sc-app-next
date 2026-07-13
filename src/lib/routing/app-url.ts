// Generic path builder: if a store hash is available, scope the path under
// it (matching the [storeHash] route segment); otherwise return the path
// unchanged (matching the root-level route aliases used in MOCK/STATIC dev).
// Callers don't need to know about DataMode — see resolveStoreHash, which
// enforces that a storeHash is only ever missing when that's valid.
//
// Deliberately relative — every current caller renders this as an in-app
// href for client-side navigation (main-nav, tables, etc.), where a relative
// path is correct and host-independent. Callers that need a fully-qualified
// URL (e.g. a redirect Location header from a route handler, which must
// resolve correctly regardless of what host/proxy actually received the
// request) should use getAbsoluteAppUrl instead of resolving this against
// request.url — see its comment for why.
export function getAppUrl(storeHash: string | undefined, path: string): string {
  if (!storeHash) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `/${storeHash}${normalizedPath}`;
}

// Absolute counterpart to getAppUrl, anchored to APP_ORIGIN rather than
// whatever host/scheme the current request happened to arrive on.
// request.url can't be trusted for this: behind a proxy or on Cloudflare,
// the URL the server observes isn't guaranteed to match the public origin
// BigCommerce/the browser actually used, so resolving a redirect against it
// can silently produce the wrong host or scheme. APP_ORIGIN is the one
// explicitly-configured, known-good value — the same reasoning that governs
// the OAuth redirect_uri sent to BigCommerce's token endpoint (see
// lib/bc-auth/install-store.ts), just applied to browser-facing redirects
// too.
export function getAbsoluteAppUrl(storeHash: string | undefined, path: string): string {
  const appOrigin = process.env.APP_ORIGIN;

  if (!appOrigin) {
    throw new Error("APP_ORIGIN must be set to build an absolute app URL.");
  }

  return new URL(getAppUrl(storeHash, path), appOrigin).toString();
}
