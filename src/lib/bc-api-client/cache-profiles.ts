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

// Caching is opt-in, and off unless CACHE_ENABLED is explicitly "true". An
// admin-privileged app showing stale data is usually the worse
// trade-off (see the caching section of docs/ARCHITECTURE.md), so the safe
// behavior is the default and enabling it is a deliberate choice.
function isCachingEnabled(): boolean {
  return process.env.CACHE_ENABLED?.toLowerCase() === "true";
}

// This is an admin-privileged app, so most fetches use a short lifetime —
// changes made directly in the BigCommerce control panel, or by another
// admin, shouldn't stay stale for long even where no cache tag invalidates
// them.
const STANDARD_REVALIDATE_SECONDS = 300;

// Channels change far less often than gift certificates or customers
// (they're a store configuration concern, not day-to-day transactional
// data), so this can tolerate a much longer lifetime.
const EXTENDED_REVALIDATE_SECONDS = 600;

const REVALIDATE_SECONDS = {
  standard: STANDARD_REVALIDATE_SECONDS,
  extended: EXTENDED_REVALIDATE_SECONDS,
} as const;

export type CacheProfile = keyof typeof REVALIDATE_SECONDS;

// What a caller passes to a fetching function to say "this response is
// cacheable, under these tags, with this lifetime." Tags are the same ones
// the `use cache` boundaries declared via cacheTag, so the existing
// revalidateTag call sites keep working unchanged.
export interface CacheOptions {
  profile: CacheProfile;
  tags: string[];
}

// Translates a CacheOptions into the `next` fetch option Next.js reads.
// With caching disabled this returns `cache: "no-store"` instead, so every
// request re-fetches — the fetch-level equivalent of the old
// CACHE_DISABLED_PROFILE (revalidate: 0), and the reason call sites can
// always pass their tags without checking the env var themselves.
export function toFetchCacheOptions(cache: CacheOptions | undefined): RequestInit {
  if (!cache || !isCachingEnabled()) {
    return { cache: "no-store" };
  }

  return { next: { revalidate: REVALIDATE_SECONDS[cache.profile], tags: cache.tags } };
}
