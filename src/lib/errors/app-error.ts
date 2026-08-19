// Base class for errors this app throws deliberately, as opposed to letting
// a raw driver/library error propagate unchanged — raw errors can carry
// sensitive detail (a connection string, a file path) that must never reach
// a client response or an unredacted log. Call sites that catch a raw error
// should log the original (via logError) and throw/return an AppError with
// a message that's already safe to surface.
export type AppErrorCode = "AUTH" | "NOT_FOUND" | "UPSTREAM_API" | "DATABASE" | "VALIDATION";

export class AppError extends Error {
  readonly code: AppErrorCode;
  // Only meaningful for UPSTREAM_API — the HTTP status BigCommerce actually
  // responded with, so a caller can distinguish a 404 from any other
  // upstream failure without parsing the message/cause string.
  readonly status?: number;

  constructor(code: AppErrorCode, message: string, options?: { cause?: unknown; status?: number }) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
    this.status = options?.status;
  }
}

// Narrows an unknown catch value to a message that's always safe to show a
// user: an AppError's own message (already vetted safe), or a generic
// fallback for anything else, which may not be safe to surface verbatim.
export function toSafeMessage(error: unknown, fallback = "Something went wrong."): string {
  return error instanceof AppError ? error.message : fallback;
}

// True when an error means "the record isn't there," as opposed to any other
// failure. Two shapes both mean that, because the two API versions this app
// talks to report a missing record differently:
//
//   - a real 404 from BigCommerce, surfaced by the REST client as an
//     UPSTREAM_API AppError carrying status 404 (v2 single-resource
//     endpoints, e.g. a gift certificate by id);
//   - an explicit NOT_FOUND AppError raised by a data-access function that
//     had to decide for itself, since v3 list-style lookups report a missing
//     record as an empty result rather than a 404 (see customers-api.ts).
//
// Callers use this to tell the user the record is gone (most likely deleted
// since the page was loaded) rather than showing a generic failure message.
export function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof AppError)) {
    return false;
  }

  return error.code === "NOT_FOUND" || (error.code === "UPSTREAM_API" && error.status === 404);
}
