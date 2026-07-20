"use client";

import { useParams, usePathname } from "next/navigation";
import { Box } from "@/components/ui/box";
import { Flex } from "@/components/ui/flex";
import { Text } from "@/components/ui/text";
import { AppLink } from "@/components/ui/app-link";
import { getAppUrl } from "@/lib/routing/app-url";

const NAV_ITEMS = [
  { id: "gift-certs", title: "Gift Certificates" },
  { id: "customers", title: "Customers" },
];

// The active section is the one piece of nav state that's legitimately
// derived from the current route; storeHash is not — it's read directly
// below via useParams() (undefined on root-level dev routes, which have no
// [storeHash] segment at all — same behavior as before, just read here
// instead of passed down from a server layout).
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
//
// Reads storeHash via useParams() rather than taking it as a prop, so the
// server component tree above this (AppShell) never needs to await params
// just to compute a value only this client component uses — that await was
// the one thing forcing the whole shell to block on route-param resolution
// before painting anything.
export function MainNav() {
  const params = useParams<{ storeHash?: string }>();
  const storeHash = params.storeHash;
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
            <AppLink
              aria-current={isActive ? "page" : undefined}
              href={getAppUrl(storeHash, `/${item.id}`)}
              style={{ textDecoration: "none" }}
            >
              <Text bold={isActive} color={isActive ? "primary" : "secondary70"} margin="none">
                {item.title}
              </Text>
            </AppLink>
          </Box>
        );
      })}
    </Flex>
  );
}
