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
        <MainNav storeHash={storeHash} />
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
