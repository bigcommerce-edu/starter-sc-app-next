"use client";

import { ErrorFallback } from "@/components/layout/error-fallback";

// Catches any uncaught render failure under [storeHash] not already caught
// by a more specific boundary. Deliberately does NOT import AppShell:
// error.tsx must be a Client Component, and AppShell transitively reaches
// server-only code (the SQLite driver imports node:fs), which fails the
// client build. This doesn't lose the nav/shell chrome, though — the parent
// layout.tsx that renders AppShell stays mounted above this boundary and is
// unaffected by a child error.
export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback onRetry={reset} />;
}
