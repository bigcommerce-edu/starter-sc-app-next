import { Suspense } from "react";
import { AppShellChrome } from "@/components/gift-certs-manager/app-shell-chrome";
import { ContentFallback } from "@/components/layout/content-fallback";

// AppShellChrome renders synchronously (no dynamic dependency of its own),
// so it sits outside the Suspense boundary rather than wrapping it — the
// boundary only needs to cover `children`, which is where the
// (authenticated) layout's session check and the page's own data fetching
// actually happen. This is what lets the shell paint immediately while the
// content area shows ContentFallback until the auth check + page data
// resolve, instead of blocking the whole shell on both.
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShellChrome>
      <Suspense fallback={<ContentFallback />}>{children}</Suspense>
    </AppShellChrome>
  );
}
