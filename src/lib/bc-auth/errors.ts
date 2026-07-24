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
