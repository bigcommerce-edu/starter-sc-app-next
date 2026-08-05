import { AppShell } from "@/components/gift-certs-manager/app-shell";
import { BigCommerceControlPanelSync } from "@/components/layout/bigcommerce-control-panel-sync";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {/*
        Mounted at the store layout (not the root layout) so it only runs for
        store-scoped routes, the ones actually launched inside the control
        panel — the root-level aliases used in MOCK/STATIC dev aren't, and
        neither are the /auth, /load and error routes, so there's no control
        panel to stay in sync with there.
      */}
      <BigCommerceControlPanelSync />
      {children}
    </AppShell>
  );
}
