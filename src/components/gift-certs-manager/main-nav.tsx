"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/big-design";
import { getAppUrl } from "@/lib/routing/app-url";

const NAV_ITEMS = [
  { id: "gift-certs", title: "Gift Certificates" },
  { id: "customers", title: "Customers" },
];

// The active tab is the one piece of nav state that's legitimately derived
// from the current route; storeHash is not — it's passed down from the
// layout that actually has it as a route param (see [storeHash]/layout.tsx
// and (root)/layout.tsx).
function getActiveSection(pathname: string, storeHash: string | undefined): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  const sectionSegment = storeHash ? segments[1] : segments[0];

  return NAV_ITEMS.some((item) => item.id === sectionSegment) ? sectionSegment : undefined;
}

export function MainNav({ storeHash }: { storeHash: string | undefined }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeSection = getActiveSection(pathname, storeHash);

  // Customers doesn't have a route yet (see the customers page feature), so
  // clicking that tab is still a no-op for now.
  const handleTabClick = (tabId: string) => {
    if (tabId === "gift-certs") {
      router.push(getAppUrl(storeHash, `/${tabId}`));
    }
  };

  return <Tabs activeTab={activeSection} items={NAV_ITEMS} onTabClick={handleTabClick} />;
}
