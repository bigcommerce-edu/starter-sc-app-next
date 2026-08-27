// The app's cache lifetime profiles, and the switch that turns caching on and
// off. Every `use cache` boundary selects one by calling
// `cacheLife(cacheProfile("standard" | "extended"))`.
//
// These are passed to cacheLife as inline objects rather than being declared as
// named profiles in next.config.ts. cacheLife accepts either a profile name or
// a `{ stale, revalidate, expire }` object, and taking the second form keeps
// the profile durations and the CACHE_ENABLED switch together in one module
// instead of splitting them between the Next config and the call sites.

// Caching is opt-in, and off unless CACHE_ENABLED is explicitly "true". An
// admin-privileged app showing stale data is usually the worse trade-off (see
// the caching section of docs/ARCHITECTURE.md), so the safe behavior is the
// default and enabling it is a deliberate choice.
function isCachingEnabled(): boolean {
  return process.env.CACHE_ENABLED?.toLowerCase() === "true";
}

// Cache Components stays enabled either way — the `use cache` directives and
// cacheTag/updateTag calls throughout the app are compile-time constructs that
// can't be conditionally applied (a directive nested in an `if` is silently
// ignored, not honored), and turning cacheComponents off entirely would stop
// the app compiling. The lever that does work is the lifetime: a profile with
// revalidate: 0 makes every entry already-expired by the time the next request
// reads it, so nothing is ever reused and each request re-fetches. Next
// requires expire > revalidate, hence 1 rather than 0.
const CACHE_DISABLED_PROFILE = { stale: 0, revalidate: 0, expire: 1 };

// This is an admin-privileged app, so most fetches use a short lifetime —
// changes made directly in the BigCommerce control panel, or by another admin,
// shouldn't stay stale for long even where no cache tag invalidates them.
const STANDARD_PROFILE = { stale: 300, revalidate: 300, expire: 300 };

// Channels change far less often than gift certificates or customers (they're
// a store configuration concern, not day-to-day transactional data), so this
// can tolerate a much longer lifetime.
const EXTENDED_PROFILE = { stale: 600, revalidate: 600, expire: 600 };

const PROFILES = {
  standard: STANDARD_PROFILE,
  extended: EXTENDED_PROFILE,
} as const;

export type CacheProfile = keyof typeof PROFILES;

// What every `use cache` boundary passes to cacheLife. Returns the
// zero-second profile when caching is off, which is why call sites can always
// name their profile and never have to check the env var themselves.
export function cacheProfile(profile: CacheProfile): typeof CACHE_DISABLED_PROFILE {
  return isCachingEnabled() ? PROFILES[profile] : CACHE_DISABLED_PROFILE;
}
