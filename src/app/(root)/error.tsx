"use client";

import { ErrorFallback } from "@/components/layout/error-fallback";

// Mirrors [storeHash]/error.tsx — see its comment on why AppShell isn't
// imported directly here.
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback onRetry={reset} />;
}
