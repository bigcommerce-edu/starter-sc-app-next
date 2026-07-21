import { NextRequest, NextResponse } from "next/server";
import { installStore } from "@/lib/bc-auth/install-store";
import { getAbsoluteAppUrl } from "@/lib/routing/app-url";

// BigCommerce's install callback. Business logic lives in
// lib/bc-auth/install-store.ts — this route only reads the request,
// delegates, and turns the result into a response.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const context = request.nextUrl.searchParams.get("context");
  const scope = request.nextUrl.searchParams.get("scope");

  if (!code || !context || !scope) {
    return NextResponse.json({ error: "code, context, and scope are required." }, { status: 400 });
  }

  // redirect_uri must exactly match what's registered for this app in the
  // BigCommerce Dev Portal — derived from APP_ORIGIN (a fixed, known-good
  // value), not request.url, which behind a proxy/on Cloudflare isn't
  // guaranteed to reflect the origin BigCommerce actually called back to.
  const { storeHash } = await installStore({
    code,
    context,
    scope,
    redirectUri: getAbsoluteAppUrl(undefined, "/api/app/auth"),
  });

  return NextResponse.redirect(getAbsoluteAppUrl(storeHash, "/"));
}
