import { AppShell } from "@/components/gift-certs-manager/app-shell";
import { renderRootRoute } from "@/lib/routing/root-route-guard";

// Wraps the root-level dev routes (no [storeHash] segment) in the same
// shell as the real routes. renderRootRoute() enforces that these only ever
// render in MOCK/STATIC mode, rendering an Unauthorized page instead of the
// real content when this layout is hit in MULTITENANT mode.
export default function RootDevLayout({ children }: { children: React.ReactNode }) {
  return renderRootRoute(
    <AppShell>
      {children}
    </AppShell>,
  );
}
