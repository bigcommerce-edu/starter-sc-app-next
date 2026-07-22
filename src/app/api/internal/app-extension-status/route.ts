import { NextRequest, NextResponse } from "next/server";
import { fetchAppExtensionStatus } from "@/lib/gift-certs-manager/app-extension-status";
import { isAuthorizedForStore } from "@/lib/session/is-authorized-for-store";

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
    return NextResponse.json({ error: "Not authorized for this store." }, { status: 403 });
  }

  const status = await fetchAppExtensionStatus(storeHash);

  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
