import { AppShell } from "@/components/layout/app-shell";

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
