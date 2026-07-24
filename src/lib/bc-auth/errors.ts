import { errors as joseErrors } from "jose";
import { ZodError } from "zod";

// Thrown by lib/bc-auth's orchestration functions so routes can distinguish
// failure modes in their catch block (e.g. map to a 401 vs. 403) without
// bc-auth itself knowing anything about HTTP — that mapping is the route's
// job as the thing actually speaking HTTP, not this library's.
export class StoreNotInstalledError extends Error {
  constructor(storeHash: string) {
    super(`Store "${storeHash}" is not installed.`);
    this.name = "StoreNotInstalledError";
  }
}

// Thrown by exchangeCodeForToken for every failure mode of the OAuth call to
// BigCommerce itself — a network failure reaching login.bigcommerce.com, a
// non-2xx response (bad/expired code, an outage on BigCommerce's side), or a
// 2xx response whose body doesn't match the expected shape. Wraps the
// original error as `cause` for logs; the message is intentionally generic
// (never shown to a merchant directly — see app-error-reason.ts) since all
// three underlying causes point to the same actionable next step: the
// install attempt itself failed before this app ever had a token, so
// there's nothing to retry except starting the install over.
export class TokenExchangeFailedError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Failed to exchange the authorization code for a BigCommerce access token.", options);
    this.name = "TokenExchangeFailedError";
  }
}

// Thrown by installStore when the token exchange with BigCommerce succeeded
// but persisting the result (the credentials-store writes, or minting the
// session cookie) failed — a materially different failure point from
// TokenExchangeFailedError: BigCommerce already issued a real access token
// by this point, so this is this app's own DB/session layer, not anything
// BigCommerce-side. Distinguishing the two lets /auth's error page tell a
// developer which system to look at first.
export class InstallSaveFailedError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Failed to save the store's installation.", options);
    this.name = "InstallSaveFailedError";
  }
}

// True only for the failure modes that mean "this signed_payload_jwt itself
// is invalid" — a bad/expired/not-yet-valid signature (jose's own error
// classes) or a well-signed payload whose claims don't match the expected
// shape (a ZodError from signedPayloadSchema.parse in verify-signed-payload.ts).
// Routes that call loadStore/removeStoreUser/uninstallStore use this to keep
// a genuine verification failure (401, expected/routine) from being confused
// with an unrelated failure downstream of verification — a credentials-store
// outage, a missing env var — which should surface as a 500 instead of being
// silently mislabeled as "Invalid signed payload," since that mislabeling
// would send anyone debugging a DB outage looking at the wrong system.
export function isSignedPayloadVerificationError(error: unknown): boolean {
  return error instanceof joseErrors.JOSEError || error instanceof ZodError;
}
