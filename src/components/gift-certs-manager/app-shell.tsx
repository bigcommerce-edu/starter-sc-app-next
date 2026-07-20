import { Box } from "@/components/ui/box";
import { Flex, FlexItem } from "@/components/ui/flex";
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
      <Box paddingHorizontal="large" paddingTop="large">
        <Suspense>
          <MainNav />
        </Suspense>
      </Box>
      <Flex padding="large" flexGap="1rem" alignItems="flex-start">
        <FlexItem flexGrow={1} flexShrink={1}>
          <Box>{children}</Box>
        </FlexItem>
        <FlexItem flexGrow={0} flexShrink={0} style={{ width: SIDEBAR_WIDTH }}>
          <DeveloperInfoPanel />
        </FlexItem>
      </Flex>
    </Box>
  );
}
