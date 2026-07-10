import { Suspense } from "react";
import { Box, Flex, FlexItem } from "@/components/ui/big-design";
import { DataModeBanner } from "@/components/layout/data-mode-banner";
import { DeveloperInfoPanel } from "@/components/layout/developer-info-panel";
import { MainNav } from "@/components/gift-certs-manager/main-nav";

const SIDEBAR_WIDTH = "280px";

export function AppShell({ children, storeHash }: { children: React.ReactNode; storeHash: string | undefined }) {
  return (
    <Box>
      <DataModeBanner />
      <Box paddingHorizontal="large" paddingTop="large">
        {/* MainNav is a client component, and the layouts that render AppShell
            pass it a storeHash derived from a dynamic route param (or from
            [storeHash]/layout.tsx awaiting `params`) — under cacheComponents,
            that makes it "uncached data" that must be isolated in its own
            Suspense boundary so it doesn't block the whole shell from
            rendering while the real per-page data fetch (already inside its
            own Suspense, see each *Page's route file) is in flight. */}
        <Suspense fallback={null}>
          <MainNav storeHash={storeHash} />
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
