// Base class for errors this app throws deliberately, as opposed to letting a
// raw driver/library error (pg, node:sqlite, fetch) propagate unchanged. The
// distinction matters because raw errors can carry sensitive detail (a
// Postgres connection string embedded in a connection-failure message, a
// local SQLite file path, etc.) that must never reach a client response or
// an unredacted log. Call sites that catch a raw error should log the
// original (via logError, which is the only thing allowed to see it) and
// throw/return an AppError with a message that's already safe to surface.
export type AppErrorCode = "AUTH" | "NOT_FOUND" | "UPSTREAM_API" | "DATABASE" | "VALIDATION";

export class AppError extends Error {
  readonly code: AppErrorCode;
  // Only meaningful for UPSTREAM_API — the HTTP status BigCommerce actually
  // responded with, so a caller (e.g. a detail page's fetch) can tell "this
  // resource doesn't exist" (404) apart from any other upstream failure
  // without parsing the message/cause string.
  readonly status?: number;

  constructor(code: AppErrorCode, message: string, options?: { cause?: unknown; status?: number }) {
    super(message, options);
    this.name = "AppError";
    this.code = code;
    this.status = options?.status;
  }
}

// Narrows an unknown catch value to a message that's always safe to show a
// user or return from a Server Action — an AppError's own message for
// AppErrors (already vetted safe by whoever threw it), or a fixed generic
// fallback for anything else (a raw driver error, a thrown string, etc.),
// since those may not be safe to surface verbatim.
export function toSafeMessage(error: unknown, fallback = "Something went wrong."): string {
  return error instanceof AppError ? error.message : fallback;
}
