import { NextRequest, NextResponse } from "next/server";
import { removeStoreUser } from "@/lib/bc-auth/remove-store-user";
import { isSignedPayloadVerificationError } from "@/lib/bc-auth/errors";
import { logError } from "@/lib/errors/logger";
import { jsonError } from "@/lib/errors/json-error";

// BigCommerce's remove-user callback (server-to-server, not browser-facing).
// Business logic lives in lib/bc-auth/remove-store-user.ts.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const signedPayloadJwt = request.nextUrl.searchParams.get("signed_payload_jwt");

  if (!signedPayloadJwt) {
    return jsonError(400, "signed_payload_jwt is required.");
  }

  try {
    await removeStoreUser(signedPayloadJwt);
  } catch (error) {
    if (isSignedPayloadVerificationError(error)) {
      return jsonError(401, "Invalid signed payload.");
    }

    // Anything else (a credentials-store failure) is not a bad JWT. Logged
    // since this is the only way to notice a real outage here; BigCommerce
    // may interpret a 401 as "don't retry."
    logError("GET /api/app/remove_user", error);

    return jsonError(500, "Failed to remove the user.");
  }

  return NextResponse.json({}, { status: 200 });
}
