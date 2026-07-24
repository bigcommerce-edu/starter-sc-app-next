import { NextRequest, NextResponse } from "next/server";
import { getDataMode } from "@/lib/bc-api-client/resolve-store-credentials";
import { signSession, verifySession } from "@/lib/session/session-jwt";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session/types";

function redirectToUnauthorized(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/unauthorized", request.url));
}

// Runs before any matched request reaches rendering — a cheap, optimistic
// gate: verifies the session cookie's JWT signature and its
// authenticatedStores claim against the URL's storeHash segment, with no DB
// or network access (see this file's own comment above matcher for why that
// split matters). This is NOT the authoritative authorization check — it
// only confirms the *cookie* claims access to this store, not that the
// store_users link backing that claim still actually exists server-side
// (e.g. it could have been revoked via /remove_user after the cookie was
// issued). The authoritative check is isAuthorizedForStore
// (lib/session/is-authorized-for-store.ts), which every protected page and
// Server Action still calls itself — this proxy only exists to reject the
// common, cheap-to-detect cases (no cookie, wrong store, expired JWT) before
// any shell/page content ever streams, which isAuthorizedForStore alone
// can't do (it runs from inside the render tree, below where
// app/store/[storeHash]/layout.tsx has already committed to rendering
// AppShell around children).
//
// On success, this also slides the cookie's expiration forward by re-
// signing it with a fresh TTL on every matched request — see
// session-jwt.ts's SESSION_TTL_SECONDS. Without this, the cookie's TTL is
// only ever set once at install/launch time (via upsertSessionStore, called
// from /auth and /load), so a merchant actively using the app for longer
// than that fixed window would be logged out mid-session with no in-app way
// to get a fresh one — BigCommerce itself can only ever re-mint a session
// via /load, which the app cannot redirect back to from inside its own
// iframe. Refreshing here means "TTL" effectively becomes "TTL since last
// request," not "TTL since login."
export async function proxy(request: NextRequest): Promise<NextResponse> {
  // MOCK/STATIC have no real session/store concept — see
  // isAuthorizedForStore's own identical bypass and resolve-store-credentials.ts.
  if (getDataMode() !== "MULTITENANT") {
    return NextResponse.next();
  }

  // pathname is "/store/<storeHash>/..." for every request this matcher
  // lets through (see the literal "/store" segment in matcher below), so
  // the hash is always segment index 2 — index 0 is "", index 1 is
  // "store".
  const storeHash = request.nextUrl.pathname.split("/")[2];
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!storeHash || !sessionCookie) {
    return redirectToUnauthorized(request);
  }

  let session: Awaited<ReturnType<typeof verifySession>>;

  try {
    session = await verifySession(sessionCookie);
  } catch {
    return redirectToUnauthorized(request);
  }

  if (!session.authenticatedStores.includes(storeHash)) {
    return redirectToUnauthorized(request);
  }

  const response = NextResponse.next();
  const refreshedJwt = await signSession(session);

  response.cookies.set(SESSION_COOKIE_NAME, refreshedJwt, SESSION_COOKIE_OPTIONS);

  return response;
}

// The single, visible source of truth for which URL paths this optimistic
// gate protects. Next requires this array to be a literal here (it's
// extracted via static analysis at build time, not by executing this
// module — an imported constant is rejected with an "invalid page config"
// build error), so this is the one place to look at (and, if needed, edit)
// for what's protected, not a config imported from elsewhere.
//
// One wildcard entry covers every route under app/store/[storeHash]/ (the
// landing page, gift-certs, customers, and anything added later) — a
// developer adding a new feature there never has to remember to also update
// this list. This only works cleanly because of the literal "/store"
// segment (see app-url.ts's getAppUrl): a bare "/:storeHash{/:path}*"
// pattern, with no static prefix, cannot be distinguished from this app's
// own top-level routes (e.g. /unauthorized, /app-error), which are also
// reachable path shapes — that ambiguity was confirmed to cause a real
// redirect loop before the "/store" segment was introduced specifically to
// resolve it.
//
// Pattern syntax is Next's proxy `matcher` config (path-to-regexp under the
// hood) — see https://nextjs.org/docs/app/api-reference/file-conventions/proxy#matcher.
// ":storeHash" is a plain positional capture group matching exactly one path
// segment (Next does not cross-reference it against the real
// app/store/[storeHash] route segment — the name is for readability only);
// "{/:path}*" matches an optional, indefinitely-repeating "/segment" suffix,
// so this matches "/store/abc123" (the landing page alone),
// "/store/abc123/gift-certs", and "/store/abc123/gift-certs/456" (or any
// other nested feature path) alike. (root)'s own dev-only routes (no
// storeHash segment at all) are intentionally not included: they only
// render in MOCK/STATIC mode, which this proxy already bypasses entirely
// above.
export const config = {
  matcher: ["/store/:storeHash{/:path}*"],
};
