import { AppShell } from "@/components/gift-certs-manager/app-shell";

// AppShell renders synchronously (no dynamic dependency of its own), so it
// sits outside the Suspense boundary rather than wrapping it — the boundary
// only needs to cover `children`, which is where each page's own session
// check and data fetching actually happen (see each page.tsx's
// AuthorizedPage wrapper — there is no shared (authenticated) layout doing
// this, since a layout's check is skippable on client-side navigations that
// reuse its cached RSC output; see is-authorized-for-store.ts). This is what
// lets the shell paint immediately while the content area shows
// ContentFallback until the auth check + page data resolve, instead of
// blocking the whole shell on both.
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
