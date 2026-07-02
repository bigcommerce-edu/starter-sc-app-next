import { Box, Flex, FlexItem } from "@/components/ui/big-design";
import { DeveloperInfoPanel } from "@/components/layout/developer-info-panel";

const SIDEBAR_WIDTH = "280px";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Flex padding="large" flexGap="1rem" alignItems="flex-start">
      <FlexItem flexGrow={1} flexShrink={1}>
        <Box>{children}</Box>
      </FlexItem>
      <FlexItem flexGrow={0} flexShrink={0} style={{ width: SIDEBAR_WIDTH }}>
        <DeveloperInfoPanel />
      </FlexItem>
    </Flex>
  );
}
