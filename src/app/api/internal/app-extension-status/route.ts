import { NextRequest, NextResponse } from "next/server";
import { fetchAppExtensionStatus } from "@/lib/gift-certs-manager/app-extension-status";
import { isAuthorizedForStore } from "@/lib/session/is-authorized-for-store";

// Called by AppExtensionStatusBanner (a client component) to check whether
// this app's App Extension is registered for the current store, without
// that check ever blocking a page render. Unlike app/api/app/* (BigCommerce
// server-to-server callbacks, verified via signed JWT), this route is called
// from our own frontend, so it's authorized the same way a Server Action
// would be — see isAuthorizedForStore.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const storeHash = request.nextUrl.searchParams.get("storeHash") ?? undefined;

  if (!(await isAuthorizedForStore(storeHash))) {
    return NextResponse.json({ error: "Not authorized for this store." }, { status: 403 });
  }

  const status = await fetchAppExtensionStatus(storeHash);

  return NextResponse.json(status);
}
