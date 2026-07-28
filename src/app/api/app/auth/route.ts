import { NextRequest, NextResponse } from "next/server";
import { installStore } from "@/lib/bc-auth/install-store";
import { InstallSaveFailedError, TokenExchangeFailedError } from "@/lib/bc-auth/errors";
import { getAppErrorUrl } from "@/lib/bc-auth/app-error-reason";
import { registerAppExtension } from "@/lib/gift-certs-manager/register-app-extension";
import { getAbsoluteAppUrl } from "@/lib/routing/app-url";
import { logError } from "@/lib/errors/logger";

// BigCommerce's install callback. Agnostic install logic lives in
// lib/bc-auth/install-store.ts — this route calls that, then separately
// registers this app's Gift Certificates Manager-specific App Extension
// using the token installStore just obtained. BigCommerce navigates the
// merchant's iframe directly to this route, so an install failure redirects
// to /app-error rather than returning JSON.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const context = request.nextUrl.searchParams.get("context");
  const scope = request.nextUrl.searchParams.get("scope");

  if (!code || !context || !scope) {
    logError("GET /api/app/auth", new Error("code, context, and scope are required."));

    return NextResponse.redirect(getAbsoluteAppUrl(undefined, getAppErrorUrl("INSTALL_FAILED")));
  }

  let storeHash: string;
  let accessToken: string;

  try {
    // redirect_uri must exactly match what's registered in the BigCommerce
    // Dev Portal — derived from APP_ORIGIN, not request.url, which behind a
    // proxy isn't guaranteed to reflect the origin BigCommerce called back to.
    ({ storeHash, accessToken } = await installStore({
      code,
      context,
      scope,
      redirectUri: getAbsoluteAppUrl(undefined, "/api/app/auth"),
    }));
  } catch (error) {
    // Distinguishes which stage of installStore's execution failed so
    // /app-error's message points at the right system — BigCommerce's OAuth
    // endpoint vs. this app's credentials-store/session layer.
    logError("GET /api/app/auth: installStore", error);

    if (error instanceof TokenExchangeFailedError) {
      return NextResponse.redirect(getAbsoluteAppUrl(undefined, getAppErrorUrl("TOKEN_EXCHANGE_FAILED")));
    }

    if (error instanceof InstallSaveFailedError) {
      return NextResponse.redirect(getAbsoluteAppUrl(undefined, getAppErrorUrl("INSTALL_SAVE_FAILED")));
    }

    return NextResponse.redirect(getAbsoluteAppUrl(undefined, getAppErrorUrl("INSTALL_FAILED")));
  }

  // Deliberately outside the try/catch above: registerAppExtension already
  // swallows and logs its own failures.
  await registerAppExtension(storeHash, accessToken);

  return NextResponse.redirect(getAbsoluteAppUrl(storeHash, "/"));
}
