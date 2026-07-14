import { AppShell } from "@/components/gift-certs-manager/app-shell";
import { renderRootRoute } from "@/lib/routing/root-route-guard";

// Wraps the root-level dev routes (no [storeHash] segment) in the same
// AppShell as the real routes, with storeHash explicitly undefined — these
// routes only ever render in MOCK/STATIC mode (see root-route-guard.tsx). `renderRootRoute()` enforces this by
// rendering an Unauthorized page instead of the real content when this
// layout is hit in MULTITENANT mode.
export default function RootDevLayout({ children }: { children: React.ReactNode }) {
  return renderRootRoute(
    <AppShell storeHash={undefined}>{children}</AppShell>
  );
}
