import { Suspense } from "react";
import { AppShellChrome } from "@/components/gift-certs-manager/app-shell-chrome";
import { ContentFallback } from "@/components/layout/content-fallback";
import { renderRootRoute } from "@/lib/routing/root-route-guard";

// Wraps the root-level dev routes (no [storeHash] segment) in the same
// shell as the real routes — these routes only ever render in MOCK/STATIC
// mode (see root-route-guard.tsx). `renderRootRoute()` enforces this by
// rendering an Unauthorized page instead of the real content when this
// layout is hit in MULTITENANT mode. Same shell/content Suspense split as
// [storeHash]/layout.tsx — see its comment for why.
export default function RootDevLayout({ children }: { children: React.ReactNode }) {
  return renderRootRoute(
    <AppShellChrome>
      <Suspense fallback={<ContentFallback />}>{children}</Suspense>
    </AppShellChrome>,
  );
}
