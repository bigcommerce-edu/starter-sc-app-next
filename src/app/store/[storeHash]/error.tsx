"use client";

import { ErrorFallback } from "@/components/layout/error-fallback";

// Catches any uncaught render failure under [storeHash] not already caught
// by a more specific boundary (see gift-certs/[id]/error.tsx,
// customers/[id]/error.tsx) — a DB blip, an upstream BigCommerce API
// failure, etc. Deliberately does NOT import AppShell here: error.tsx must
// be a Client Component (it receives reset), and AppShell transitively
// reaches server-only code (getCredentialsStore's SQLite driver, which
// imports node:fs) — bundling that for the client fails the build outright.
// This doesn't lose the nav/shell chrome, though: per Next's own component
// hierarchy, error.tsx wraps page.js/nested layout.js in a boundary, but the
// *parent* layout.tsx at this same segment level (which is what actually
// renders AppShell — see [storeHash]/layout.tsx) stays mounted above the
// boundary and is unaffected by a child error.
export default function StoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback onRetry={reset} />;
}
