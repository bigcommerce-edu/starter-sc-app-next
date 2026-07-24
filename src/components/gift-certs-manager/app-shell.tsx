import { Box, Flex, FlexItem } from "@/components/ui/big-design";
import { AppExtensionStatusBanner } from "@/components/gift-certs-manager/app-extension-status-banner";
import { DataModeBanner } from "@/components/layout/data-mode-banner";
import { DeveloperInfoPanel } from "@/components/layout/developer-info-panel";
import { MainNav } from "@/components/gift-certs-manager/main-nav";
import { Suspense } from "react";

const SIDEBAR_WIDTH = "280px";

// The shell chrome has no dynamic dependency of its own, so this is a plain,
// sync Server Component that renders immediately regardless of how long
// `children` takes to resolve.
//
// MainNav and AppExtensionStatusBanner both read useParams() client-side —
// under cacheComponents, route params are "blocks navigation" data even from
// a Client Component, so each needs its own Suspense boundary or Next throws.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box>
      <DataModeBanner />
      <Suspense>
        <AppExtensionStatusBanner />
      </Suspense>
      {/*
        Below the "wide" breakpoint, a table-heavy page is wider than a
        narrowed control-panel iframe can show alongside a fixed-width
        sidebar. flexDirection uses BigDesign's ResponsiveProp (real CSS
        @media queries), which measures the iframe's own content window
        rather than the parent control panel page.

        DeveloperInfoPanel is a flex item in this same container (not a
        separate row alongside just `children`) so it reflows relative to
        the nav — coming after the nav+content item places it to the right
        in row mode and below in column mode via DOM order alone.
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
