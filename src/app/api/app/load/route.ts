import { NextRequest, NextResponse } from "next/server";
import { StoreNotInstalledError } from "@/lib/bc-auth/errors";
import { loadStore } from "@/lib/bc-auth/load-store";
import { getAbsoluteAppUrl } from "@/lib/routing/app-url";

// BigCommerce's launch callback. Business logic lives in
// lib/bc-auth/load-store.ts — this route only reads the request, delegates,
// and turns the result (or a thrown error) into a response.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const signedPayloadJwt = request.nextUrl.searchParams.get("signed_payload_jwt");

  if (!signedPayloadJwt) {
    return NextResponse.json({ error: "signed_payload_jwt is required." }, { status: 400 });
  }

  let storeHash: string;

  try {
    ({ storeHash } = await loadStore(signedPayloadJwt));
  } catch (error) {
    if (error instanceof StoreNotInstalledError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Invalid signed payload." }, { status: 401 });
  }

  return NextResponse.redirect(getAbsoluteAppUrl(storeHash, "/"));
}
