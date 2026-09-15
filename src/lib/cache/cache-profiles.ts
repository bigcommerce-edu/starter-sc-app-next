// The app's cache lifetime profiles and cache-on/off switch, applied at the
// fetch level (Cache Components is off for the Workers target — see
// next.config.ts).

// A cache lifetime, in seconds. Only `revalidate` is expressible per-fetch;
// Next's NextFetchRequestConfig has no equivalent of cacheLife's separate
// stale/expire bounds.
export interface CacheLifetimeProfile {
  revalidate: number;
}

// Opt-in: off unless CACHE_ENABLED is explicitly "true", since stale data in
// an admin-privileged app is usually the worse trade-off.
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
const STANDARD_PROFILE: CacheLifetimeProfile = { revalidate: 300 };

// For store configuration (e.g. channels), which changes far less often than
// transactional data.
const EXTENDED_PROFILE: CacheLifetimeProfile = { revalidate: 600 };

const PROFILES = {
  [CACHE_PROFILE_STANDARD]: STANDARD_PROFILE,
  [CACHE_PROFILE_EXTENDED]: EXTENDED_PROFILE,
} as const satisfies Record<string, CacheLifetimeProfile>;

export type CacheProfile = keyof typeof PROFILES;

// Marks a response as cacheable under the given tags and lifetime.
export interface CacheOptions {
  profile: CacheProfile;
  tags: string[];
}

// The lifetime a given profile resolves to.
export function cacheProfile(profile: CacheProfile): CacheLifetimeProfile {
  return PROFILES[profile];
}

// Translates CacheOptions into the `next` fetch option Next.js reads. With
// caching disabled, returns `cache: "no-store"` so every request re-fetches —
// which is why call sites can always pass their tags without checking
// CACHE_ENABLED themselves.
export function toFetchCacheOptions(cache: CacheOptions | undefined): RequestInit {
  if (!cache || !isCachingEnabled()) {
    return { cache: "no-store" };
  }

  return { next: { revalidate: cacheProfile(cache.profile).revalidate, tags: cache.tags } };
}
