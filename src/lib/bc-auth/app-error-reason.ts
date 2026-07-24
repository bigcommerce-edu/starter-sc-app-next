// Closed set of reasons /auth and /load can redirect to /app-error with —
// deliberately not the raw error message: BigCommerce navigates the
// merchant's iframe directly to these routes, so a failure response has to
// be something the iframe can actually render (an HTML page), and the
// reason has to be a value this app itself resolved server-side (via
// StoreNotInstalledError/isSignedPayloadVerificationError/
// TokenExchangeFailedError/InstallSaveFailedError, the same classification
// each route already does for its JSON-response callers), not something a
// caller could set directly — see app-error/page.tsx, which maps each of
// these to a fixed, human-written message rather than trusting arbitrary
// query-string content.
//
// No single shared "server error" reason: /auth's fallback (INSTALL_FAILED)
// and /load's fallback (LOAD_FAILED) need different copy — an install that
// never completed should never tell a merchant to "reopen the app" (there's
// nothing installed yet to reopen), while a /load failure legitimately can,
// since the store was already installed successfully at some point. Keeping
// them as separate reasons means neither route's fallback message has to be
// vague enough to avoid contradicting the other's context.
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
