import { NextRequest, NextResponse } from "next/server";
import { isSignedPayloadVerificationError, StoreNotInstalledError } from "@/lib/bc-auth/errors";
import { getAppErrorUrl } from "@/lib/bc-auth/app-error-reason";
import { loadStore } from "@/lib/bc-auth/load-store";
import { getAbsoluteAppUrl } from "@/lib/routing/app-url";
import { logError } from "@/lib/errors/logger";

// BigCommerce's launch callback. Business logic lives in
// lib/bc-auth/load-store.ts. Unlike /remove_user and /uninstall
// (server-to-server), BigCommerce navigates the merchant's iframe directly
// to this route, so failures redirect to /app-error instead of returning
// JSON.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const signedPayloadJwt = request.nextUrl.searchParams.get("signed_payload_jwt");

  if (!signedPayloadJwt) {
    logError("GET /api/app/load", new Error("signed_payload_jwt is required."));

    return NextResponse.redirect(getAbsoluteAppUrl(undefined, getAppErrorUrl("LOAD_FAILED")));
  }

  let storeHash: string;
  let url: string;

  try {
    ({ storeHash, url } = await loadStore(signedPayloadJwt));
  } catch (error) {
    if (error instanceof StoreNotInstalledError) {
      return NextResponse.redirect(getAbsoluteAppUrl(undefined, getAppErrorUrl("NOT_INSTALLED")));
    }

    if (isSignedPayloadVerificationError(error)) {
      return NextResponse.redirect(getAbsoluteAppUrl(undefined, getAppErrorUrl("INVALID_SESSION")));
    }

    // Anything else (a credentials-store failure, a missing env var) is not
    // a bad JWT — reporting it as "Invalid signed payload" would send anyone
    // debugging a DB outage looking at the wrong system.
    logError("GET /api/app/load", error);

    return NextResponse.redirect(getAbsoluteAppUrl(undefined, getAppErrorUrl("LOAD_FAILED")));
  }

  return NextResponse.redirect(getAbsoluteAppUrl(storeHash, url));
}
