"use client";

import { ErrorFallback } from "@/components/layout/error-fallback";

// Mirrors [storeHash]/error.tsx — see its comment on why AppShell isn't
// imported directly here. This route group only renders in MOCK/STATIC mode
// (see root-route-guard.tsx), but DataModeBanner already treats a
// misconfigured production deployment left in that mode as a real,
// guarded-against risk, so this gets the same boundary coverage.
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback onRetry={reset} />;
}
