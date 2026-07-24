import { AppShell } from "@/components/gift-certs-manager/app-shell";

// AppShell renders synchronously, so it sits outside the Suspense boundary
// each page.tsx wraps its own AuthorizedPage in — this lets the shell paint
// immediately while the content area shows ContentFallback until the auth
// check and page data resolve.
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
