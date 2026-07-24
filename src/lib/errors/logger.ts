// Opt-out, not opt-in: error logging is core to production hardening (it's
// the only way an operator notices a DB outage, a bad install, etc. — see
// e.g. install-store.ts's partial-failure comment), so it defaults to
// enabled. ERROR_LOGGING_ENABLED exists for a deployment that pipes
// console.error somewhere unwanted (e.g. a noisy local dev run, or a
// platform that bills per log line) rather than for turning logging off by
// default everywhere — set it to "false" to disable.
function isErrorLoggingEnabled(): boolean {
  return process.env.ERROR_LOGGING_ENABLED?.toLowerCase() !== "false";
}

// Single choke point for logging caught errors, so there's exactly one place
// that needs to be careful about not leaking sensitive detail (connection
// strings, tokens, file paths embedded in driver error messages) into logs,
// rather than that judgment call being repeated ad hoc at every catch site.
// This app has no external log aggregator wired up, so this still writes to
// console.error — the point isn't where it goes today, it's that every
// call site goes through the same function so a future redaction fix or a
// swap to a real logging backend only has to happen once.
export function logError(context: string, error: unknown): void {
  if (!isErrorLoggingEnabled()) {
    return;
  }

  console.error(`[${context}]`, error);
}
