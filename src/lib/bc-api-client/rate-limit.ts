import { logRateLimitThrottle } from "@/lib/errors/logger";

// BigCommerce's documented rate-limit headers (REST Admin API) — see
// https://developer.bigcommerce.com/docs/rest-authentication/rate-limits.
// Present on every REST response, success or error alike. Not currently
// documented for the GraphQL Admin API, but this module is deliberately
// framework-agnostic (it only needs a Headers object, not a REST- or
// GraphQL-specific response shape) — see rest-client.ts for the one place
// that currently calls it, and graphql-client.ts's own TODO — so if/when
// GraphQL is confirmed to support this, a caller there can reuse this
// unchanged rather than this policy being redefined per protocol. All four
// headers are read (not just the two the actual trigger needs) so a
// developer reading this file sees the complete header set BigCommerce
// sends, not just the subset one particular threshold strategy happens to
// consume.
const HEADER_REQUESTS_LEFT = "X-Rate-Limit-Requests-Left";
const HEADER_REQUESTS_QUOTA = "X-Rate-Limit-Requests-Quota";
const HEADER_TIME_WINDOW_MS = "X-Rate-Limit-Time-Window-Ms";
const HEADER_TIME_RESET_MS = "X-Rate-Limit-Time-Reset-Ms";

// Proportional, not absolute: back off once less than this fraction of the
// window's quota remains (requestsLeft / requestsQuota), rather than a flat
// requests-left count — a flat count (e.g. "back off below 2 requests left")
// doesn't scale across BigCommerce's own per-plan quota tiers (Standard/Plus:
// 20,000/hr, Pro: 60,000/hr, Enterprise: custom), where the same absolute
// number means a very different safety margin. 20% is a conventional
// last-fifth-of-budget threshold, not a BigCommerce-documented figure —
// there's no vendor-specified value for this, so this is a reasonable
// default a developer forking this app should feel free to tune.
const LOW_REQUESTS_REMAINING_RATIO = 0.2;

// Proactive only — no retry, no resend. This never re-sends the request it
// throttled; it only delays returning control to the caller of whatever
// fetch already completed. That's what makes it safe to apply uniformly to
// reads AND mutations alike, unlike a reactive retry-on-429 scheme would be:
// a retry risks resending a mutation whose first attempt may have already
// succeeded server-side despite an error response (see rest-client.ts's own
// comment on why mutations get no AbortSignal.timeout, for the same
// underlying ambiguous-outcome concern) — but merely waiting before
// returning the (already-final) response/thrown error has no such risk,
// since nothing is sent twice.
export async function throttleOnLowRateLimit(headers: Headers): Promise<void> {
  const requestsLeft = Number(headers.get(HEADER_REQUESTS_LEFT));
  const requestsQuota = Number(headers.get(HEADER_REQUESTS_QUOTA));

  if (!Number.isFinite(requestsLeft) || !Number.isFinite(requestsQuota) || requestsQuota <= 0) {
    return;
  }

  if (requestsLeft / requestsQuota >= LOW_REQUESTS_REMAINING_RATIO) {
    return;
  }

  const timeResetMs = Number(headers.get(HEADER_TIME_RESET_MS));

  if (!Number.isFinite(timeResetMs) || timeResetMs <= 0) {
    return;
  }

  // timeWindowMs is not part of the trigger condition above (only
  // requestsLeft/requestsQuota decide whether to wait, and timeResetMs
  // decides how long) — it's read and logged purely to give a developer
  // reading logs the full picture BigCommerce reported, not because the
  // wait calculation itself needs it. Falls back to "unknown" rather than
  // skipping the whole throttle if this one header is ever missing, since
  // it's diagnostic-only.
  const timeWindowMsHeader = headers.get(HEADER_TIME_WINDOW_MS);

  logRateLimitThrottle({
    requestsLeft,
    requestsQuota,
    timeWindowMs: timeWindowMsHeader !== null ? Number(timeWindowMsHeader) : undefined,
    timeResetMs,
  });

  await new Promise((resolve) => setTimeout(resolve, timeResetMs));
}
