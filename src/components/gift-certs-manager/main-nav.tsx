"use client";

import { useParams, usePathname } from "next/navigation";
import { Box } from "@/components/ui/box";
import { Flex } from "@/components/ui/flex";
import { Text } from "@/components/ui/text";
import { AppLink } from "@/components/ui/app-link";
import { getAppUrl } from "@/lib/routing/app-url";

// isIndex marks the item whose page is also served at the app's root path.
// The root route is a pass-through re-export of the gift certificates page
// (see app/store/[storeHash]/page.tsx), so "/" renders that section without
// "gift-certs" ever appearing in the URL — this flag is what lets the item
// claim the index route without anything outside this directory needing to
// know which section the root happens to point at. Move it if the root
// pass-through is ever re-pointed at another section.
const NAV_ITEMS = [
  { id: "gift-certs", title: "Gift Certificates", isIndex: true },
  { id: "customers", title: "Customers", isIndex: false },
];

// A store-scoped path is "/store/<storeHash>/<section>" (see app-url.ts's
// getAppUrl) — segments[2] is the section. A root-level dev route (no
// storeHash, no "/store" prefix) has its section at segments[0] instead.
//
// An absent section segment means the index route ("/" or
// "/store/<storeHash>"), which resolves to whichever item is flagged
// isIndex rather than leaving no item highlighted.
function getActiveSection(pathname: string, storeHash: string | undefined): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  const sectionSegment = storeHash ? segments[2] : segments[0];

  if (!sectionSegment) {
    return NAV_ITEMS.find((item) => item.isIndex)?.id;
  }

  return NAV_ITEMS.some((item) => item.id === sectionSegment) ? sectionSegment : undefined;
}

// Built from plain links rather than BigDesign's Tabs component, since this
// is cross-page navigation (each "tab" a separate route), not same-page tab
// panels — Tabs assumes an ARIA tablist with same-page panels. The
// pill-on-background look is deliberate, so it doesn't read as the same kind
// of control as the underline-style Tabs used on the detail page.
//
// Reads storeHash via useParams() rather than a prop, so AppShell never
// needs to await params just to compute a value only this component uses.
export function MainNav() {
  const params = useParams<{ storeHash?: string }>();
  const storeHash = params.storeHash;
  const pathname = usePathname();
  const activeSection = getActiveSection(pathname, storeHash);

  return (
    <Flex alignItems="stretch" flexGap="0.5rem" role="navigation" aria-label="Main">
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
            <AppLink
              aria-current={isActive ? "page" : undefined}
              href={getAppUrl(storeHash, `/${item.id}`)}
              style={{ textDecoration: "none" }}
            >
              <Text bold color={isActive ? "primary" : "secondary70"} margin="none">
                {item.title}
              </Text>
            </AppLink>
          </Box>
        );
      })}
    </Flex>
  );
}
