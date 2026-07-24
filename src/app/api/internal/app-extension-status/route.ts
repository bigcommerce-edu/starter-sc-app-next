import { NextRequest, NextResponse } from "next/server";
import { fetchAppExtensionStatus } from "@/lib/gift-certs-manager/app-extension-status";
import { isAuthorizedForStore, NOT_AUTHORIZED_FOR_STORE_MESSAGE } from "@/lib/session/is-authorized-for-store";
import { logError } from "@/lib/errors/logger";
import { jsonError } from "@/lib/errors/json-error";

// Called by AppExtensionStatusBanner (a client component) to check whether
// this app's App Extension is registered for the current store, without
// that check ever blocking a page render. Unlike app/api/app/* (BigCommerce
// server-to-server callbacks, verified via signed JWT), this route is called
// from our own frontend, so it's authorized the same way a Server Action
// would be — see isAuthorizedForStore.
//
// Sends Cache-Control: no-store, not just relying on the banner's own
// fetch(url, { cache: "no-store" }) — a GET Route Handler's response is
// otherwise eligible for the browser's default HTTP caching, and this
// route's result can go stale (a successful retry, or install-time
// registration finally succeeding) without this URL ever changing. That's a
// different, browser/HTTP-level cache from the "use cache: remote"/
// cacheTag/updateTag machinery in app-extension-status.ts, which only
// governs the server's own render cache — so relying on that alone (or on
// every future caller remembering to pass its own no-store fetch option)
// left responses here able to get stuck stale regardless of what updateTag
// does server-side. (No route segment config here: under cacheComponents,
// a Route Handler with no "use cache" directive is dynamic by default, and
// export const dynamic is explicitly rejected at build time rather than
// just being redundant.)
export async function GET(request: NextRequest): Promise<NextResponse> {
  const storeHash = request.nextUrl.searchParams.get("storeHash") ?? undefined;

  if (!(await isAuthorizedForStore(storeHash))) {
    return jsonError(403, NOT_AUTHORIZED_FOR_STORE_MESSAGE);
  }

  try {
    const status = await fetchAppExtensionStatus(storeHash);

    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // This route is polled by a purely cosmetic client-side banner (see
    // AppExtensionStatusBanner) — a failure here should never surface as a
    // broken fetch to that component; a 500 with no body detail lets the
    // banner's own catch treat it the same as any other check failure (see
    // that component's comment on why a failed check simply hides the
    // banner rather than showing an error state).
    logError("GET /api/internal/app-extension-status", error);

    return jsonError(500, "Failed to check app extension status.");
  }
}
