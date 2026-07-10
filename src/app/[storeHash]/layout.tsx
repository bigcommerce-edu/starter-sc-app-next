import { Suspense } from "react";
import { AppShell } from "@/components/gift-certs-manager/app-shell";

// Renders the part of AppShell that actually needs storeHash, isolated in
// its own component so the `await params` (a dynamic route param read) can
// be wrapped in a Suspense boundary below, rather than blocking the whole
// shell — matching the same pattern AppShell already uses to isolate MainNav.
async function StoreAppShell({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeHash: string }>;
}) {
  const { storeHash } = await params;

  return <AppShell storeHash={storeHash}>{children}</AppShell>;
}

export default function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeHash: string }>;
}) {
  return (
    <Suspense>
      <StoreAppShell params={params}>{children}</StoreAppShell>
    </Suspense>
  );
}
