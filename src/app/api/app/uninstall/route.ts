import { NextRequest, NextResponse } from "next/server";
import { uninstallStore } from "@/lib/bc-auth/uninstall-store";

// BigCommerce's uninstall callback (server-to-server, not browser-facing).
// Business logic lives in lib/bc-auth/uninstall-store.ts — this route only
// reads the request, delegates, and turns the result (or a thrown error)
// into a response. A failed verification 401s instead of a no-op 200, so a
// forged/expired call can't be mistaken for a real uninstall.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const signedPayloadJwt = request.nextUrl.searchParams.get("signed_payload_jwt");

  if (!signedPayloadJwt) {
    return NextResponse.json({ error: "signed_payload_jwt is required." }, { status: 400 });
  }

  try {
    await uninstallStore(signedPayloadJwt);
  } catch {
    return NextResponse.json({ error: "Invalid signed payload." }, { status: 401 });
  }

  return NextResponse.json({}, { status: 200 });
}
