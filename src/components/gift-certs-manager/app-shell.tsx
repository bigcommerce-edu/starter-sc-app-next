import { Box, Flex, FlexItem } from "@/components/ui/big-design";
import { DataModeBanner } from "@/components/layout/data-mode-banner";
import { DeveloperInfoPanel } from "@/components/layout/developer-info-panel";

const SIDEBAR_WIDTH = "280px";

// No MainNav or AppExtensionStatusBanner yet - neither exists until a later
// enhancement.
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box>
      <DataModeBanner />
      {/*
        Below the "wide" breakpoint, a table-heavy page is wider than a
        narrowed control-panel iframe can show alongside a fixed-width
        sidebar. flexDirection uses BigDesign's ResponsiveProp (real CSS
        @media queries), which measures the iframe's own content window
        rather than the parent control panel page.
      */}
      <Flex
        flexDirection={{ mobile: "column", wide: "row" }}
        padding="large"
        flexGap="1rem"
        alignItems={{ mobile: "stretch", wide: "flex-start" }}
      >
        <FlexItem flexGrow={1} flexShrink={1} flexBasis={{ mobile: "auto", wide: "0" }}>
          <Box>{children}</Box>
        </FlexItem>
        <FlexItem flexGrow={0} flexShrink={0} style={{ width: SIDEBAR_WIDTH }}>
          <DeveloperInfoPanel />
        </FlexItem>
      </Flex>
    </Box>
  );
}
