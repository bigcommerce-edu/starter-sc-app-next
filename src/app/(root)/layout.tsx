import { DataModeBanner } from "@/components/layout/data-mode-banner";
import { renderRootRoute } from "@/lib/routing/root-route-guard";

// Wraps the root-level dev routes (no [storeHash] segment) — these routes
// only ever render in MOCK/STATIC mode. `renderRootRoute()` enforces this by
// rendering an Unauthorized page instead of the real content when this
// layout is hit in MULTITENANT mode.
export default function RootDevLayout({ children }: { children: React.ReactNode }) {
  return renderRootRoute(
    <div>
      <DataModeBanner />
      {children}
    </div>
  );
}
