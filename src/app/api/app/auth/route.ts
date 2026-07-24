import { NextRequest, NextResponse } from "next/server";
import { installStore } from "@/lib/bc-auth/install-store";
import { InstallSaveFailedError, TokenExchangeFailedError } from "@/lib/bc-auth/errors";
import { getAppErrorUrl } from "@/lib/bc-auth/app-error-reason";
import { registerAppExtension } from "@/lib/gift-certs-manager/register-app-extension";
import { getAbsoluteAppUrl } from "@/lib/routing/app-url";
import { logError } from "@/lib/errors/logger";

// BigCommerce's install callback. Agnostic install logic lives in
// lib/bc-auth/install-store.ts — this route calls that, then separately
// registers this app's (Gift Certificates Manager-specific) App Extension
// using the token installStore just obtained, before turning the result
// into a response. registerAppExtension is called here rather than from
// within installStore, since installStore is agnostic single-click-app
// plumbing that shouldn't need to know this specific extension exists.
// Like /load, BigCommerce navigates the merchant's iframe directly to this
// route, so an install failure redirects to /app-error rather than
// returning JSON — see app-error-reason.ts.
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
    // A failure here means the store was never actually installed —
    // nothing to roll back, but the merchant's browser is mid-redirect from
    // BigCommerce and needs *some* response rather than an unhandled
    // exception, which Next has no error boundary for in a Route Handler.
    // Distinguishes which stage of installStore's execution actually failed
    // (see install-store.ts/exchange-code-for-token.ts's own comments) so
    // /app-error's message points a developer at the right system —
    // BigCommerce's own OAuth endpoint vs. this app's credentials-store/
    // session layer — rather than one blanket "something went wrong."
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
  // swallows and logs its own failures (a missing extension shouldn't block
  // an otherwise-successful install) — see its own doc comment.
  await registerAppExtension(storeHash, accessToken);

  return NextResponse.redirect(getAbsoluteAppUrl(storeHash, "/"));
}
