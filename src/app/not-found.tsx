import { NotFoundFallback } from "@/components/layout/not-found-fallback";

// Root-level catch-all for any path that fails to resolve a route at all —
// routing unwinds this far up when nothing below it, not even [storeHash]'s
// own not-found.tsx, ever matched. Unlike global-error.tsx, this still
// renders inside the root layout, just without AppShell.
export default function RootNotFound() {
  return <NotFoundFallback />;
}
