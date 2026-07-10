"use client";

import { usePathname } from "next/navigation";
import { Box, Flex, Link, Text } from "@/components/ui/big-design";
import { getAppUrl } from "@/lib/routing/app-url";

const NAV_ITEMS = [
  { id: "gift-certs", title: "Gift Certificates" },
  { id: "customers", title: "Customers" },
];

// The active section is the one piece of nav state that's legitimately
// derived from the current route; storeHash is not — it's passed down from
// the layout that actually has it as a route param (see [storeHash]/layout.tsx
// and (root)/layout.tsx).
function getActiveSection(pathname: string, storeHash: string | undefined): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  const sectionSegment = storeHash ? segments[1] : segments[0];

  return NAV_ITEMS.some((item) => item.id === sectionSegment) ? sectionSegment : undefined;
}

// This is cross-page navigation, not same-page tab panels, so it's built
// from plain links rather than BigDesign's Tabs component — Tabs assumes an
// ARIA tablist whose tabs each control a same-page panel identified by an
// element id, which doesn't apply here (each "tab" is really a whole
// separate route) and previously caused a console warning about a missing
// aria-controls target. The pill-on-background look (vs. the underline look
// `Tabs` uses for the gift certificate detail page's in-page tabs) is also
// deliberate, so the two don't read as the same kind of control.
export function MainNav({ storeHash }: { storeHash: string | undefined }) {
  const pathname = usePathname();
  const activeSection = getActiveSection(pathname, storeHash);

  return (
    <Flex flexGap="0.5rem" role="navigation" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === activeSection;

        return (
          <Box
            key={item.id}
            backgroundColor={isActive ? "primary10" : undefined}
            paddingHorizontal="medium"
            paddingVertical="xSmall"
            style={{ borderRadius: "9999px" }}
          >
            <Link
              aria-current={isActive ? "page" : undefined}
              href={getAppUrl(storeHash, `/${item.id}`)}
              style={{ textDecoration: "none" }}
            >
              <Text bold={isActive} color={isActive ? "primary" : "secondary70"} margin="none">
                {item.title}
              </Text>
            </Link>
          </Box>
        );
      })}
    </Flex>
  );
}
