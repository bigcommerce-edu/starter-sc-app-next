// Opt-out, not opt-in: error logging is the only way an operator notices a
// DB outage, a bad install, etc., so it defaults to enabled. Set
// ERROR_LOGGING_ENABLED to "false" to disable for a deployment that pipes
// console.error somewhere unwanted.
function isErrorLoggingEnabled(): boolean {
  return process.env.ERROR_LOGGING_ENABLED?.toLowerCase() !== "false";
}

// Single choke point for logging caught errors, so there's exactly one place
// that needs to be careful about leaking sensitive detail (connection
// strings, tokens, file paths) into logs. Still writes to console.error —
// every call site going through this function means a future swap to a real
// logging backend only has to happen once.
export function logError(context: string, error: unknown): void {
  if (!isErrorLoggingEnabled()) {
    return;
  }

  console.error(`[${context}]`, error);
}
