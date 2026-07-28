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

// Thrown by exchangeCodeForToken for any failure of the OAuth call to
// BigCommerce itself (network failure, non-2xx, or unexpected response
// shape). The message is generic — never shown to a merchant directly, see
// app-error-reason.ts — since all three point to the same next step:
// nothing to retry except starting the install over.
export class TokenExchangeFailedError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Failed to exchange the authorization code for a BigCommerce access token.", options);
    this.name = "TokenExchangeFailedError";
  }
}

// Thrown by installStore when the token exchange succeeded but persisting
// the result (credentials-store writes, session cookie) failed — this
// app's own DB/session layer, not BigCommerce's side. Distinguishing the
// two lets /auth's error page point a developer at the right system.
export class InstallSaveFailedError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("Failed to save the store's installation.", options);
    this.name = "InstallSaveFailedError";
  }
}

// True only when the signed_payload_jwt itself is invalid (bad signature,
// expiry, or shape mismatch) — lets callers tell that apart from an
// unrelated downstream failure (DB outage, missing env var), which should
// surface as a 500 rather than a misleading "Invalid signed payload."
export function isSignedPayloadVerificationError(error: unknown): boolean {
  return error instanceof joseErrors.JOSEError || error instanceof ZodError;
}
