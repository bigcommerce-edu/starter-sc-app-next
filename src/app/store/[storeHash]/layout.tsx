import { AppShell } from "@/components/gift-certs-manager/app-shell";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
