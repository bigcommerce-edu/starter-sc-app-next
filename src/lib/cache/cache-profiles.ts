// Fetch-level caching options, replacing the `use cache` / cacheLife setup
// this app used previously. Cache Components (PPR) had to be turned off for
// the Cloudflare Workers target — see the comment on `cacheComponents` in
// next.config.ts — but the caching *strategy* is unchanged: the same two
// lifetime profiles, and the same cache tags, just applied to the fetches
// the cached components used to wrap rather than to the components.
//
// Since there's no `cacheComponents` flag to satisfy here, CACHE_ENABLED can be
// read directly at the call site instead of having to be folded into a
// cacheLife profile override.

// A cache lifetime, in seconds. Only `revalidate` is expressible at the fetch
// level: Next's per-fetch config (NextFetchRequestConfig) takes a revalidate
// window and tags, with no equivalent of cacheLife's separate stale/expire
// bounds. A `use cache` build of this app carries all three — see the same
// module on the Cache Components branch.
export interface CacheLifetimeProfile {
  revalidate: number;
}

// Caching is opt-in, and off unless CACHE_ENABLED is explicitly "true". An
// admin-privileged app showing stale data is usually the worse
// trade-off (see the caching section of docs/ARCHITECTURE.md), so the safe
// behavior is the default and enabling it is a deliberate choice.
function isCachingEnabled(): boolean {
  return process.env.CACHE_ENABLED?.toLowerCase() === "true";
}

// Profile names, exported so call sites select a profile by constant rather
// than by repeating a bare string.
export const CACHE_PROFILE_STANDARD = "standard";
export const CACHE_PROFILE_EXTENDED = "extended";

// This is an admin-privileged app, so most fetches use a short lifetime —
// changes made directly in the BigCommerce control panel, or by another
// admin, shouldn't stay stale for long even where no cache tag invalidates
// them.
const STANDARD_PROFILE: CacheLifetimeProfile = { revalidate: 300 };

// Channels change far less often than gift certificates or customers
// (they're a store configuration concern, not day-to-day transactional
// data), so this can tolerate a much longer lifetime.
const EXTENDED_PROFILE: CacheLifetimeProfile = { revalidate: 600 };

const PROFILES = {
  [CACHE_PROFILE_STANDARD]: STANDARD_PROFILE,
  [CACHE_PROFILE_EXTENDED]: EXTENDED_PROFILE,
} as const satisfies Record<string, CacheLifetimeProfile>;

export type CacheProfile = keyof typeof PROFILES;

// What a caller passes to a fetching function to say "this response is
// cacheable, under these tags, with this lifetime." Tags are the same ones
// the `use cache` boundaries declared via cacheTag, so the existing
// revalidateTag call sites keep working unchanged.
export interface CacheOptions {
  profile: CacheProfile;
  tags: string[];
}

// The lifetime a given profile resolves to. Kept as its own function so the
// profile lookup has one home, mirroring `cacheProfile` on the Cache
// Components branch.
export function cacheProfile(profile: CacheProfile): CacheLifetimeProfile {
  return PROFILES[profile];
}

// Translates a CacheOptions into the `next` fetch option Next.js reads.
// With caching disabled this returns `cache: "no-store"` instead, so every
// request re-fetches — the fetch-level equivalent of a zero-second lifetime,
// and the reason call sites can always pass their tags without checking the
// env var themselves.
export function toFetchCacheOptions(cache: CacheOptions | undefined): RequestInit {
  if (!cache || !isCachingEnabled()) {
    return { cache: "no-store" };
  }

  return { next: { revalidate: cacheProfile(cache.profile).revalidate, tags: cache.tags } };
}
