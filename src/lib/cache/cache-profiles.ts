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

// A request annotated with this profile must never be served from cache. 
export const CACHE_PROFILE_NONE = "no-cache";

// This is an admin-privileged app, so most fetches use a short lifetime —
// changes made directly in the BigCommerce control panel, or by another
// admin, shouldn't stay stale for long even where no cache tag invalidates
// them.
const STANDARD_PROFILE: CacheLifetimeProfile = { revalidate: 300, stale: 300, expire: 300 };

// For data that changes very infrequently
const EXTENDED_PROFILE: CacheLifetimeProfile = { revalidate: 600, stale: 600, expire: 600 };

// `null` for the no-cache profile, since there is no lifetime to express —
// it is handled as its own case wherever a profile is consumed, rather than
// being given a sentinel lifetime that might accidentally be honored.
const PROFILES = {
  [CACHE_PROFILE_STANDARD]: STANDARD_PROFILE,
  [CACHE_PROFILE_EXTENDED]: EXTENDED_PROFILE,
  [CACHE_PROFILE_NONE]: null,
} as const satisfies Record<string, CacheLifetimeProfile | null>;

export type CacheProfile = keyof typeof PROFILES;

// ======= Cache Components implementation =======
// A profile with
// revalidate: 0 makes every entry already-expired by the time the next request
// reads it, so nothing is ever reused and each request re-fetches. Next
// requires expire > revalidate, hence 1 rather than 0.
const CACHE_DISABLED_PROFILE: CacheLifetimeProfile = { revalidate: 0, stale: 0, expire: 1 };
// ======= End of Cache Components implementation =======


// ======= Fetch caching implementation =======
// Marks a response as cacheable under the given tags and lifetime, or — with
// CACHE_PROFILE_NONE — explicitly not cacheable at all.
export interface CacheOptions {
  profile: CacheProfile;
  tags?: string[];
}

// Translates CacheOptions into the `next` fetch option Next.js reads.
//
// Three cases, in order:
//
//   - CACHE_PROFILE_NONE: `cache: "no-store"`, an explicit instruction that
//     this response must never be served from cache.
//   - No options, or caching switched off: no fetch options at all.
//   - Anything else: the profile's revalidate window and its tags.
export function toFetchCacheOptions(cache: CacheOptions | undefined): RequestInit {
  if (cache?.profile === CACHE_PROFILE_NONE) {
    return { cache: "no-store" };
  }

  if (!cache || !isCachingEnabled()) {
    return {};
  }

  return { next: { revalidate: cacheProfile(cache.profile).revalidate, tags: cache.tags } };
}
// ======= End of Fetch caching implementation =======

// What every `use cache` boundary passes to cacheLife
export function cacheProfile(profile: CacheProfile): CacheLifetimeProfile {
  if (!isCachingEnabled()) {
    return CACHE_DISABLED_PROFILE;
  }

  return PROFILES[profile] ?? CACHE_DISABLED_PROFILE;
}
