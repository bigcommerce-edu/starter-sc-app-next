"use client";

import { useParams, usePathname } from "next/navigation";
import { Box, Flex, Text } from "@/components/ui/big-design";
import { AppLink } from "@/components/ui/app-link";
import { getAppUrl } from "@/lib/routing/app-url";

const NAV_ITEMS = [
  { id: "gift-certs", title: "Gift Certificates" },
  { id: "customers", title: "Customers" },
];

// A store-scoped path is "/store/<storeHash>/<section>" (see app-url.ts's
// getAppUrl) — segments[2] is the section. A root-level dev route (no
// storeHash, no "/store" prefix) has its section at segments[0] instead.
function getActiveSection(pathname: string, storeHash: string | undefined): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  const sectionSegment = storeHash ? segments[2] : segments[0];

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
