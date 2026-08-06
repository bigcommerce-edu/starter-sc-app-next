// TODO: Constants for rate-limit headers

// TODO: Implement parseOptionalNumber to simplify parsing rate-limit headers

// TODO: implement retryOnRateLimit - reactive, single-retry rate-limit handling
//  - read BigCommerce's rate-limit headers (X-Rate-Limit-Requests-Left,
//    X-Rate-Limit-Requests-Quota, X-Rate-Limit-Time-Window-Ms,
//    X-Rate-Limit-Time-Reset-Ms) off the response
//  - only kick in on a 429, and only retry once - a second 429 is returned
//    to the caller as-is
//  - Time-Reset-Ms drives the delay; the others are diagnostic-only, logged
//    via a new logRateLimitRetry function in errors/logger.ts
//  - no usable Time-Reset-Ms means no safe delay - give up rather than guess
