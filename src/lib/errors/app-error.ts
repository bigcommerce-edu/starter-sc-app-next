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
