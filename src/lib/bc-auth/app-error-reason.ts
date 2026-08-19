// Closed set of reasons /auth and /load can redirect to /app-error with —
// never the raw error message, since the reason must be something
// app-error/page.tsx can map to a fixed, human-written message rather than
// trusting arbitrary query-string content.
//
// No single shared "server error" reason: an install that never completed
// (/auth's INSTALL_FAILED) should never tell a merchant to "reopen the app,"
// while a /load failure (LOAD_FAILED) legitimately can, since the store was
// already installed successfully at some point.
export type AppErrorReason =
  | "NOT_INSTALLED"
  | "INVALID_SESSION"
  | "TOKEN_EXCHANGE_FAILED"
  | "INSTALL_SAVE_FAILED"
  | "INSTALL_FAILED"
  | "LOAD_FAILED";

const APP_ERROR_REASONS: readonly AppErrorReason[] = [
  "NOT_INSTALLED",
  "INVALID_SESSION",
  "TOKEN_EXCHANGE_FAILED",
  "INSTALL_SAVE_FAILED",
  "INSTALL_FAILED",
  "LOAD_FAILED",
];

export function isAppErrorReason(value: string | null): value is AppErrorReason {
  return (APP_ERROR_REASONS as readonly string[]).includes(value ?? "");
}

// Shared by /auth and /load — the only two routes BigCommerce navigates the
// merchant's iframe to directly (see AppErrorRoute's own comment on why
// /remove_user and /uninstall, being server-to-server callbacks, must keep
// returning a plain JSON response instead of a redirect).
export function getAppErrorUrl(reason: AppErrorReason): string {
  return `/app-error?reason=${reason}`;
}
