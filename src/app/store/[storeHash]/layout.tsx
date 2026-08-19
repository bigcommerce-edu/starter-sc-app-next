import { AppShell } from "@/components/gift-certs-manager/app-shell";
import { ControlPanelLogoutListener } from "@/components/layout/control-panel-logout-listener";

// AppShell renders synchronously, so it sits outside the Suspense boundary
// each page.tsx wraps its own AuthorizedPage in — this lets the shell paint
// immediately while the content area shows ContentFallback until the auth
// check and page data resolve.
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {/*
        Mounted at the store layout (not the root layout) so it only runs for
        store-scoped, authenticated routes — the root-level aliases used in
        MOCK/STATIC dev have no session cookie to clear, and the /auth,
        /load and error routes aren't rendered inside the control panel.
      */}
      <ControlPanelLogoutListener />
      {children}
    </AppShell>
  );
}
