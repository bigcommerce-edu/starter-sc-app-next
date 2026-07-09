import { DataModeBanner } from "@/components/layout/data-mode-banner";

// Wraps the root-level dev routes (no [storeHash] segment) — these routes
// only ever render in MOCK/STATIC mode (see root-route-guard.tsx).
export default function RootDevLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <DataModeBanner />
      {children}
    </div>
  );
}
