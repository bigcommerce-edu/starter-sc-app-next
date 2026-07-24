import { NextRequest, NextResponse } from "next/server";
import { getDataMode } from "@/lib/bc-api-client/resolve-store-credentials";
import { signSession, verifySession } from "@/lib/session/session-jwt";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/session/types";

function redirectToUnauthorized(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/unauthorized", request.url));
}

// Primary, optimistic authorization gate — verifies the session cookie's
// JWT signature and its authenticatedStores claim against the URL's
// storeHash, with no DB access. This is not the authoritative check (see
// isAuthorizedForStore and docs/ARCHITECTURE.md for the full two-tier
// design) — it only rejects the cheap, common cases before any shell/page
// content streams.
//
// On success, also slides the cookie's expiration forward by re-signing it
// with a fresh TTL on every matched request, so the effective session
// lifetime is "since last request" rather than "since login" — BigCommerce
// can only mint a fresh session via /load, which this app has no way to
// trigger from inside its own iframe.
export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (getDataMode() !== "MULTITENANT") {
    return NextResponse.next();
  }

  // pathname is "/store/<storeHash>/..." for every request this matcher
  // lets through, so the hash is always segment index 2.
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

// The single source of truth for which URL paths this gate protects. Next
// requires this array to be a literal (extracted via static analysis at
// build time, not by executing this module), so this is the one place to
// edit for what's protected.
//
// One wildcard entry covers every route under app/store/[storeHash]/ — a
// developer adding a new feature there never has to update this list. The
// literal "/store" prefix (see app-url.ts's getAppUrl) is what lets this
// matcher unambiguously target store-scoped routes without also matching
// this app's own top-level routes (/unauthorized, /app-error).
export const config = {
  matcher: ["/store/:storeHash{/:path}*"],
};
