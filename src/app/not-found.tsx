import { NotFoundFallback } from "@/components/layout/not-found-fallback";

// Root-level catch-all for any path that fails to resolve a route at all
// (e.g. /some-store-hash/some-nonexistent-path) — routing unwinds all the
// way up to this file when nothing below it (not even [storeHash]'s own
// not-found.tsx) ever got to run, since [storeHash] itself never matched
// anything for that path. Unlike global-error.tsx, this renders *inside*
// the root layout.tsx (BigDesignProvider/StyledComponentsRegistry are still
// mounted), just without AppShell — that's only rendered by (root)'s and
// [storeHash]'s own layout.tsx, neither of which is part of this path's
// render tree when routing fails this early.
export default function RootNotFound() {
  return <NotFoundFallback />;
}
