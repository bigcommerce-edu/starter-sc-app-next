import { Suspense } from "react";
import { AppShell } from "@/components/gift-certs-manager/app-shell";

export default function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense>
      <AppShell params={params}>{children}</AppShell>
    </Suspense>
  );
}
