import { NextRequest, NextResponse } from "next/server";
import { isSignedPayloadVerificationError, StoreNotInstalledError } from "@/lib/bc-auth/errors";
import { loadStore } from "@/lib/bc-auth/load-store";
import { getAbsoluteAppUrl } from "@/lib/routing/app-url";
import { logError } from "@/lib/errors/logger";
import { jsonError } from "@/lib/errors/json-error";

// BigCommerce's launch callback. Business logic lives in
// lib/bc-auth/load-store.ts — this route only reads the request, delegates,
// and turns the result (or a thrown error) into a response.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const signedPayloadJwt = request.nextUrl.searchParams.get("signed_payload_jwt");

  if (!signedPayloadJwt) {
    return jsonError(400, "signed_payload_jwt is required.");
  }

  let storeHash: string;
  let url: string;

  try {
    ({ storeHash, url } = await loadStore(signedPayloadJwt));
  } catch (error) {
    if (error instanceof StoreNotInstalledError) {
      return jsonError(403, error.message);
    }

    if (isSignedPayloadVerificationError(error)) {
      return jsonError(401, "Invalid signed payload.");
    }

    // Anything else (a credentials-store failure, a missing env var) is not
    // a bad JWT — reporting it as "Invalid signed payload" would send anyone
    // debugging a DB outage looking at the wrong system. See
    // isSignedPayloadVerificationError's own comment.
    logError("GET /api/app/load", error);

    return jsonError(500, "Failed to load the store.");
  }

  return NextResponse.redirect(getAbsoluteAppUrl(storeHash, url));
}
