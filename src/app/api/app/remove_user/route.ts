import { NextRequest, NextResponse } from "next/server";
import { removeStoreUser } from "@/lib/bc-auth/remove-store-user";

// BigCommerce's remove-user callback (server-to-server, not browser-facing).
// Business logic lives in lib/bc-auth/remove-store-user.ts — this route
// only reads the request, delegates, and turns the result (or a thrown
// error) into a response.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const signedPayloadJwt = request.nextUrl.searchParams.get("signed_payload_jwt");

  if (!signedPayloadJwt) {
    return NextResponse.json({ error: "signed_payload_jwt is required." }, { status: 400 });
  }

  try {
    await removeStoreUser(signedPayloadJwt);
  } catch {
    return NextResponse.json({ error: "Invalid signed payload." }, { status: 401 });
  }

  return NextResponse.json({}, { status: 200 });
}
