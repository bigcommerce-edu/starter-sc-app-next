import { z } from "zod";
import { TokenExchangeFailedError } from "@/lib/bc-auth/errors";

const BC_LOGIN_URL = "https://login.bigcommerce.com";

const tokenResponseSchema = z.object({
  access_token: z.string(),
  scope: z.string(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
  }),
  context: z.string(),
  account_uuid: z.string(),
});

export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export interface ExchangeCodeParams {
  code: string;
  context: string;
  scope: string;
  redirectUri: string;
}

// Exchanges the /auth callback's authorization `code` for a store-scoped
// access token, per BigCommerce's OAuth install flow. A manual POST rather
// than an SDK call, to keep this legible for developers reading the sample.
// Every failure mode throws TokenExchangeFailedError (network failure,
// non-2xx, or unexpected response shape) — distinct from InstallSaveFailedError,
// which covers a failure to persist a token BigCommerce did successfully
// issue. Raw detail is attached as `cause` for logs only.
export async function exchangeCodeForToken(params: ExchangeCodeParams): Promise<TokenResponse> {
  const clientId = process.env.BIGCOMMERCE_CLIENT_ID;
  const clientSecret = process.env.BIGCOMMERCE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("BIGCOMMERCE_CLIENT_ID and BIGCOMMERCE_CLIENT_SECRET must be set to exchange an auth code.");
  }

  let response: Response;

  try {
    response = await fetch(`${BC_LOGIN_URL}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: params.code,
        context: params.context,
        scope: params.scope,
        grant_type: "authorization_code",
        redirect_uri: params.redirectUri,
      }),
    });
  } catch (error) {
    throw new TokenExchangeFailedError({ cause: error });
  }

  if (!response.ok) {
    throw new TokenExchangeFailedError({
      cause: `BigCommerce token exchange failed with status ${response.status}: ${(await response.text()).slice(0, 500)}`,
    });
  }

  try {
    return tokenResponseSchema.parse(await response.json());
  } catch (error) {
    throw new TokenExchangeFailedError({ cause: error });
  }
}
