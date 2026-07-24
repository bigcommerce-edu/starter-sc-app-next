import { logRateLimitThrottle } from "@/lib/errors/logger";

// BigCommerce's documented rate-limit headers (REST Admin API) — see
// https://developer.bigcommerce.com/docs/rest-authentication/rate-limits.
// Present on every REST response, success or error alike. This module only
// needs a Headers object (not a REST/GraphQL-specific response shape), so
// it can be reused as-is if/when GraphQL is confirmed to support this too
// (see graphql-client.ts's TODO).
const HEADER_REQUESTS_LEFT = "X-Rate-Limit-Requests-Left";
const HEADER_REQUESTS_QUOTA = "X-Rate-Limit-Requests-Quota";
const HEADER_TIME_WINDOW_MS = "X-Rate-Limit-Time-Window-Ms";
const HEADER_TIME_RESET_MS = "X-Rate-Limit-Time-Reset-Ms";

// Proportional (requestsLeft / requestsQuota), not a flat count — the same
// absolute number means a different safety margin depending on BigCommerce's
// plan-based quota tier. 20% is a reasonable default, not a
// BigCommerce-documented figure; tune freely.
const LOW_REQUESTS_REMAINING_RATIO = 0.2;

// Proactive only — no retry, no resend. This only delays returning an
// already-final response/error, so it's safe to apply uniformly to reads
// and mutations alike (unlike a reactive retry, which risks resending a
// mutation that already succeeded server-side despite an error response).
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

  // timeWindowMs is diagnostic-only (logged for context; not part of the
  // trigger condition), so a missing header falls back to "unknown" rather
  // than skipping the throttle.
  const timeWindowMsHeader = headers.get(HEADER_TIME_WINDOW_MS);

  logRateLimitThrottle({
    requestsLeft,
    requestsQuota,
    timeWindowMs: timeWindowMsHeader !== null ? Number(timeWindowMsHeader) : undefined,
    timeResetMs,
  });

  await new Promise((resolve) => setTimeout(resolve, timeResetMs));
}
