"use client";

import { Tabs } from "@/components/ui/big-design";

const NAV_ITEMS = [
  { id: "gift-certs", title: "Gift Certificates" },
  { id: "customers", title: "Customers" },
];

// storeHash isn't used yet — neither tab has a real route to navigate to
// until the gift certificates and customers page features land, so clicking
// is a no-op for now. It's accepted here (rather than added later) so
// AppShell's signature doesn't need to change again once that happens.
export function MainNav({ storeHash }: { storeHash: string | undefined }) {
  void storeHash;

  return <Tabs items={NAV_ITEMS} onTabClick={() => {}} />;
}
