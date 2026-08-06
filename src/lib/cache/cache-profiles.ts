// The app's cache lifetime profiles and cache-on/off switch

// A cache lifetime, in seconds.
export interface CacheLifetimeProfile {
  revalidate: number;

  // These two values are used only when `cacheComponents` is the implementation.
  stale: number;
  expire: number;
}

// Caching is opt-in, and off unless CACHE_ENABLED is explicitly "true"
function isCachingEnabled(): boolean {
  return process.env.CACHE_ENABLED?.toLowerCase() === "true";
}

// Profile names
export const CACHE_PROFILE_STANDARD = "standard";
export const CACHE_PROFILE_EXTENDED = "extended";

// This is an admin-privileged app, so most fetches use a short lifetime —
// changes made directly in the BigCommerce control panel, or by another
// admin, shouldn't stay stale for long even where no cache tag invalidates
// them.
const STANDARD_PROFILE: CacheLifetimeProfile = { revalidate: 300, stale: 300, expire: 300 };

// For data that changes very infrequently
const EXTENDED_PROFILE: CacheLifetimeProfile = { revalidate: 600, stale: 600, expire: 600 };

const PROFILES = {
  [CACHE_PROFILE_STANDARD]: STANDARD_PROFILE,
  [CACHE_PROFILE_EXTENDED]: EXTENDED_PROFILE,
} as const satisfies Record<string, CacheLifetimeProfile>;

export type CacheProfile = keyof typeof PROFILES;

// ======= Cache Components implementation =======
// A profile with
// revalidate: 0 makes every entry already-expired by the time the next request
// reads it, so nothing is ever reused and each request re-fetches. Next
// requires expire > revalidate, hence 1 rather than 0.
const CACHE_DISABLED_PROFILE: CacheLifetimeProfile = { revalidate: 0, stale: 0, expire: 1 };
// ======= End of Cache Components implementation =======


// What every `use cache` boundary passes to cacheLife
export function cacheProfile(profile: CacheProfile): CacheLifetimeProfile {
  return isCachingEnabled() ? PROFILES[profile] : CACHE_DISABLED_PROFILE;
}
