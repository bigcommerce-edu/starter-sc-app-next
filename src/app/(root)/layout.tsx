import { AppShell } from "@/components/layout/app-shell";

// Wraps the root-level dev routes (no [storeHash] segment) in the same
// AppShell as the real routes, with storeHash explicitly undefined — these
// routes only ever render in MOCK/STATIC mode (see root-route-guard.tsx).
export default function RootDevLayout({ children }: { children: React.ReactNode }) {
  return <AppShell storeHash={undefined}>{children}</AppShell>;
}
