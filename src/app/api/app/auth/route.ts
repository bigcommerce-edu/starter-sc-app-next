import { NextRequest, NextResponse } from "next/server";
import { installStore } from "@/lib/bc-auth/install-store";
import { registerAppExtension } from "@/lib/gift-certs-manager/register-app-extension";
import { getAbsoluteAppUrl } from "@/lib/routing/app-url";
import { logError } from "@/lib/errors/logger";
import { jsonError } from "@/lib/errors/json-error";

// BigCommerce's install callback. Agnostic install logic lives in
// lib/bc-auth/install-store.ts — this route calls that, then separately
// registers this app's (Gift Certificates Manager-specific) App Extension
// using the token installStore just obtained, before turning the result
// into a response. registerAppExtension is called here rather than from
// within installStore, since installStore is agnostic single-click-app
// plumbing that shouldn't need to know this specific extension exists.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const context = request.nextUrl.searchParams.get("context");
  const scope = request.nextUrl.searchParams.get("scope");

  if (!code || !context || !scope) {
    return jsonError(400, "code, context, and scope are required.");
  }

  let storeHash: string;
  let accessToken: string;

  try {
    // redirect_uri must exactly match what's registered for this app in the
    // BigCommerce Dev Portal — derived from APP_ORIGIN (a fixed, known-good
    // value), not request.url, which behind a proxy/on Cloudflare isn't
    // guaranteed to reflect the origin BigCommerce actually called back to.
    ({ storeHash, accessToken } = await installStore({
      code,
      context,
      scope,
      redirectUri: getAbsoluteAppUrl(undefined, "/api/app/auth"),
    }));
  } catch (error) {
    // A failure here (a bad/expired code, a token-exchange outage, a
    // credentials-store failure) means the store was never actually
    // installed — nothing to roll back, but the merchant's browser is
    // mid-redirect from BigCommerce and needs *some* response rather than
    // an unhandled exception, which Next has no error boundary for in a
    // Route Handler.
    logError("GET /api/app/auth: installStore", error);

    return jsonError(500, "Failed to install the app for this store.");
  }

  // Deliberately outside the try/catch above: registerAppExtension already
  // swallows and logs its own failures (a missing extension shouldn't block
  // an otherwise-successful install) — see its own doc comment.
  await registerAppExtension(storeHash, accessToken);

  return NextResponse.redirect(getAbsoluteAppUrl(storeHash, "/"));
}
