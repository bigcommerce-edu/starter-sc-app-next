// The app's cache lifetime profiles, and the switch that turns caching on and
// off. Every `use cache` boundary selects one by calling
// `cacheLife(cacheProfile(CACHE_PROFILE_STANDARD))`.

// A cache lifetime, in seconds. Structurally compatible with Next's own
// CacheLife type, but all three fields are required: every profile here sets
// all of them, and leaving one implicit would silently inherit Next's default
// rather than this app's intent.
//
// - stale: how long a client may serve its own cached copy without rechecking.
// - revalidate: how long before the server refreshes the entry in the
//   background.
// - expire: how long before the entry is treated as unusable and a read has to
//   wait for fresh data. Next requires this to exceed revalidate.
export interface CacheLifetimeProfile {
  stale: number;
  revalidate: number;
  expire: number;
}

// Caching is opt-in, and off unless CACHE_ENABLED is explicitly "true"
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
const CACHE_DISABLED_PROFILE: CacheLifetimeProfile = { stale: 0, revalidate: 0, expire: 1 };

// Profile names
export const CACHE_PROFILE_STANDARD = "standard";
export const CACHE_PROFILE_EXTENDED = "extended";

// This is an admin-privileged app, so most fetches use a short lifetime —
// changes made directly in the BigCommerce control panel, or by another admin,
// shouldn't stay stale for long even where no cache tag invalidates them.
const STANDARD_PROFILE: CacheLifetimeProfile = { stale: 300, revalidate: 300, expire: 300 };

// For data that changes very infrequently
const EXTENDED_PROFILE: CacheLifetimeProfile = { stale: 600, revalidate: 600, expire: 600 };

const PROFILES = {
  [CACHE_PROFILE_STANDARD]: STANDARD_PROFILE,
  [CACHE_PROFILE_EXTENDED]: EXTENDED_PROFILE,
} as const satisfies Record<string, CacheLifetimeProfile>;

export type CacheProfile = keyof typeof PROFILES;

// What every `use cache` boundary passes to cacheLife
export function cacheProfile(profile: CacheProfile): CacheLifetimeProfile {
  return isCachingEnabled() ? PROFILES[profile] : CACHE_DISABLED_PROFILE;
}
