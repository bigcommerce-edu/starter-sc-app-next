import { NextRequest, NextResponse } from "next/server";
import { fetchAppExtensionStatus } from "@/lib/gift-certs-manager/app-extension-status";
import { isAuthorizedForStore, NOT_AUTHORIZED_FOR_STORE_MESSAGE } from "@/lib/session/is-authorized-for-store";
import { logError } from "@/lib/errors/logger";
import { jsonError } from "@/lib/errors/json-error";

// Called by AppExtensionStatusBanner (a client component) to check whether
// this app's App Extension is registered, without that check ever blocking
// a page render. Unlike app/api/app/* (BigCommerce server-to-server
// callbacks, verified via signed JWT), this route is called from our own
// frontend, so it's authorized the same way a Server Action would be.
//
// Sends Cache-Control: no-store rather than relying solely on the banner's
// own fetch(url, { cache: "no-store" }) — a GET Route Handler's response is
// otherwise eligible for the browser's default HTTP caching, a different,
// browser-level cache from the cacheTag/updateTag machinery in
// app-extension-status.ts, which only governs the server's own render cache.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const storeHash = request.nextUrl.searchParams.get("storeHash") ?? undefined;

  if (!(await isAuthorizedForStore(storeHash))) {
    return jsonError(403, NOT_AUTHORIZED_FOR_STORE_MESSAGE);
  }

  try {
    const status = await fetchAppExtensionStatus(storeHash);

    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Polled by a purely cosmetic client-side banner — a 500 with no body
    // detail lets its own catch treat this the same as any other check
    // failure (hide the banner) rather than surfacing an error state.
    logError("GET /api/internal/app-extension-status", error);

    return jsonError(500, "Failed to check app extension status.");
  }
}
