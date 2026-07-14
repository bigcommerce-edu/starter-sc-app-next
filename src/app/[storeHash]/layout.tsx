import { DataModeBanner } from "@/components/layout/data-mode-banner";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeHash: string }>;
}) {
  await params;

  return (
    <div>
      <DataModeBanner />
      {children}
    </div>
  );
}
