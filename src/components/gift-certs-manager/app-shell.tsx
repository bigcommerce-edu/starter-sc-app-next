import { Box, Flex, FlexItem } from "@/components/ui/big-design";
import { AppExtensionStatusBanner } from "@/components/gift-certs-manager/app-extension-status-banner";
import { DataModeBanner } from "@/components/layout/data-mode-banner";
import { DeveloperInfoPanel } from "@/components/layout/developer-info-panel";
import { MainNav } from "@/components/gift-certs-manager/main-nav";
import { Suspense } from "react";

const SIDEBAR_WIDTH = "280px";

// The shell chrome (nav, data-mode banner, developer info sidebar) has no
// dynamic dependency of its own — DataModeBanner only reads getDataMode()
// (sync env var) and DeveloperInfoPanel only reads env vars. So this is a
// plain, sync Server Component: it takes no params, awaits nothing, and can
// render immediately regardless of how long `children` takes to resolve.
// [storeHash]/layout.tsx and (root)/layout.tsx wrap `children` (not this
// component) in the Suspense boundary that covers the auth check and page
// data — this component itself never needs one.
//
// MainNav and AppExtensionStatusBanner both read useParams() client-side —
// under cacheComponents, route params are "blocks navigation" data even
// when read from a Client Component, so each needs its own Suspense
// boundary or Next throws ("Data that blocks navigation was accessed
// outside of <Suspense>") rather than silently working the way a plain env
// var read does.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box>
      <DataModeBanner />
      <Suspense>
        <AppExtensionStatusBanner />
      </Suspense>
      {/*
        Below the "wide" breakpoint (BigDesign's theme scale: mobile 0,
        tablet 720px, desktop 1025px, wide 1500px — see
        @bigcommerce/big-design-theme's breakpoints.ts), a table-heavy page
        like the gift certificates list is wider than a narrowed
        control-panel iframe can show alongside a fixed-width sidebar,
        forcing horizontal scroll that pushes the sidebar out of frame
        entirely. flexDirection here is BigDesign's own ResponsiveProp
        mechanism (compiled to real CSS @media queries via
        styled-components, not a JS-computed breakpoint) — a CSS media
        query always measures the iframe's own content window, not the
        parent BigCommerce control panel page, so this works correctly
        inside the control panel's iframe with no special accounting for
        its width needed.

        MainNav and DeveloperInfoPanel are both flex items in this same
        container (rather than DeveloperInfoPanel living in a separate,
        narrower row alongside just `children`) so the sidebar can be
        reflowed relative to the nav at all — DeveloperInfoPanel comes
        after the nav+content item below, which is what places it to the
        right of both in row mode and below both in column mode, with no
        flexOrder needed (DOM/JSX order alone gives the same "last" position
        in both directions here). If a future layout ever needs a
        *different* order per breakpoint, FlexItem's flexOrder prop is
        itself a ResponsiveProp and would be the mechanism to reach for.
      */}
      <Flex
        flexDirection={{ mobile: "column", wide: "row" }}
        padding="large"
        flexGap="1rem"
        alignItems={{ mobile: "stretch", wide: "flex-start" }}
      >
        <FlexItem flexGrow={1} flexShrink={1} flexBasis={{ mobile: "auto", wide: "0" }}>
          <Box paddingBottom="large">
            <Suspense>
              <MainNav />
            </Suspense>
          </Box>
          <Box>{children}</Box>
        </FlexItem>
        <FlexItem flexGrow={0} flexShrink={0} style={{ width: SIDEBAR_WIDTH }}>
          <DeveloperInfoPanel />
        </FlexItem>
      </Flex>
    </Box>
  );
}
