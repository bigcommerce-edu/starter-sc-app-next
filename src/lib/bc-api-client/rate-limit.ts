import { logRateLimitRetry } from "@/lib/errors/logger";

// BigCommerce's documented rate-limit headers (REST Admin API) — see
// https://developer.bigcommerce.com/docs/rest-authentication/rate-limits.
// Present on every REST response, success or error alike. This module only
// needs a Headers object (not a REST/GraphQL-specific response shape), so
// it's shared as-is by both clients.
const HEADER_REQUESTS_LEFT = "X-Rate-Limit-Requests-Left";
const HEADER_REQUESTS_QUOTA = "X-Rate-Limit-Requests-Quota";
const HEADER_TIME_WINDOW_MS = "X-Rate-Limit-Time-Window-Ms";
const HEADER_TIME_RESET_MS = "X-Rate-Limit-Time-Reset-Ms";

const TOO_MANY_REQUESTS_STATUS = 429;

function parseOptionalNumber(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

// Reactive, single-retry rate-limit handling: only kicks in once BigCommerce
// has actually responded 429, and only retries once — never a proactive
// pre-emptive delay, and never a retry loop. A second 429 is returned to the
// caller as-is rather than retried again, so a persistently exhausted quota
// still fails fast instead of stacking up delayed retries.
//
// Time-Reset-Ms is the only header that drives the delay — Requests-Left,
// Requests-Quota, and Time-Window-Ms have no role in deciding whether or how
// long to wait (BigCommerce's 429 itself is the trigger), but are still read
// and logged for diagnostic context alongside the retry.
//
// Safe to apply uniformly to reads and mutations: a 429 means BigCommerce's
// rate limiter rejected the request before doing any work, so unlike a
// timed-out/aborted request, there's no ambiguity about whether a mutation
// already took effect — retrying it is a clean do-over, not a risk of
// double-applying a write.
export async function retryOnRateLimit(performRequest: () => Promise<Response>): Promise<Response> {
  const response = await performRequest();

  if (response.status !== TOO_MANY_REQUESTS_STATUS) {
    return response;
  }

  const timeResetMs = parseOptionalNumber(response.headers.get(HEADER_TIME_RESET_MS));

  // No usable Time-Reset-Ms gives no basis for a safe delay — give up rather
  // than guess, so the caller sees the 429 immediately instead of after a
  // meaningless wait.
  if (timeResetMs === undefined || timeResetMs <= 0) {
    return response;
  }

  logRateLimitRetry({
    requestsLeft: parseOptionalNumber(response.headers.get(HEADER_REQUESTS_LEFT)),
    requestsQuota: parseOptionalNumber(response.headers.get(HEADER_REQUESTS_QUOTA)),
    timeWindowMs: parseOptionalNumber(response.headers.get(HEADER_TIME_WINDOW_MS)),
    delayMs: timeResetMs,
  });

  await new Promise((resolve) => setTimeout(resolve, timeResetMs));

  return performRequest();
}
