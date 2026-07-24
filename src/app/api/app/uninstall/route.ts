import { NextRequest, NextResponse } from "next/server";
import { uninstallStore } from "@/lib/bc-auth/uninstall-store";
import { isSignedPayloadVerificationError } from "@/lib/bc-auth/errors";
import { logError } from "@/lib/errors/logger";
import { jsonError } from "@/lib/errors/json-error";

// BigCommerce's uninstall callback (server-to-server, not browser-facing).
// A failed verification 401s instead of a no-op 200, so a forged/expired
// call can't be mistaken for a real uninstall.
//
// This app does not need to remove its own App Extension here — BigCommerce
// automatically cleans up an app's extensions on uninstall.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const signedPayloadJwt = request.nextUrl.searchParams.get("signed_payload_jwt");

  if (!signedPayloadJwt) {
    return jsonError(400, "signed_payload_jwt is required.");
  }

  try {
    await uninstallStore(signedPayloadJwt);
  } catch (error) {
    if (isSignedPayloadVerificationError(error)) {
      return jsonError(401, "Invalid signed payload.");
    }

    // Anything else (a credentials-store failure) is not a bad JWT — see
    // isSignedPayloadVerificationError's own comment. Logged (rather than
    // silently swallowed, as before) since this is the only way to notice a
    // real outage here; BigCommerce may interpret a 401 as "don't retry,"
    // which could permanently leave stale credentials behind after an
    // uninstall that failed for infra reasons, not a bad signature.
    logError("GET /api/app/uninstall", error);

    return jsonError(500, "Failed to uninstall the store.");
  }

  return NextResponse.json({}, { status: 200 });
}
