// TODO: Import Box/Flex/FlexItem from @bigcommerce/big-design instead
import { Box } from "@/components/ui/box";
import { Flex, FlexItem } from "@/components/ui/flex";
import { DataModeBanner } from "@/components/layout/data-mode-banner";
import { DeveloperInfoPanel } from "@/components/layout/developer-info-panel";

const SIDEBAR_WIDTH = "280px";

// TODO: Convert this shell to BigDesign layout
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box>
      <DataModeBanner />
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
