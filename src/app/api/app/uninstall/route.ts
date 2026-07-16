import { NextRequest, NextResponse } from "next/server";
import { deleteInstalledStore, verifyUninstallRequest } from "@/lib/bc-auth/uninstall-store";
import { deregisterAppExtension } from "@/lib/gift-certs-manager/deregister-app-extension";

// BigCommerce's uninstall callback (server-to-server, not browser-facing).
// Agnostic verification/deletion logic lives in lib/bc-auth/uninstall-store.ts
// — this route sequences that with deregisterAppExtension (a Gift
// Certificates Manager-specific concern, so it isn't called from within
// uninstallStore itself), and turns the result (or a thrown error) into a
// response. A failed verification 401s instead of a no-op 200, so a
// forged/expired call can't be mistaken for a real uninstall.
//
// deregisterAppExtension must run between verifyUninstallRequest and
// deleteInstalledStore: it needs the store's token and its
// store_extensions row (to know the extension id), both of which
// deleteInstalledStore removes — see uninstall-store.ts.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const signedPayloadJwt = request.nextUrl.searchParams.get("signed_payload_jwt");

  if (!signedPayloadJwt) {
    return NextResponse.json({ error: "signed_payload_jwt is required." }, { status: 400 });
  }

  let storeHash: string;

  try {
    ({ storeHash } = await verifyUninstallRequest(signedPayloadJwt));
  } catch {
    return NextResponse.json({ error: "Invalid signed payload." }, { status: 401 });
  }

  await deregisterAppExtension(storeHash);
  await deleteInstalledStore(storeHash);

  return NextResponse.json({}, { status: 200 });
}
