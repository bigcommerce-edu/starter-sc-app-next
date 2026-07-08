import { AppShell } from "@/components/gift-certs-manager/app-shell";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeHash: string }>;
}) {
  const { storeHash } = await params;

  return <AppShell storeHash={storeHash}>{children}</AppShell>;
}
