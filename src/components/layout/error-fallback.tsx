import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Flex } from "@/components/ui/flex";
import { Panel } from "@/components/ui/panel";
import { H1, Text } from "@/components/ui/text";
import { ErrorIcon } from "@/components/ui/icons";

// TODO: convert this file's imports from the plain components/ui
// primitives (box.tsx, button.tsx, flex.tsx, panel.tsx, text.tsx, icons.tsx)
// to the BigDesign barrels (@bigcommerce/big-design,
// @bigcommerce/big-design-icons) - no other change needed, the JSX/props
// stay identical
//
// Shared rendering for every error.tsx in the app. Shows only a fixed,
// generic message — the real Error's message is already stripped to a
// digest by Next in production, so there's no real detail to surface.
export function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <Flex justifyContent="center" paddingVertical="xxxLarge">
      <Box style={{ maxWidth: "560px", width: "100%" }}>
        <Panel>
          <Flex flexDirection="column" alignItems="center" marginBottom="medium">
            <ErrorIcon color="danger50" size="xLarge" />
            <H1 marginTop="small" marginBottom="none">
              Something went wrong
            </H1>
          </Flex>
          <Text>
            An unexpected error occurred while loading this page. Try again, or navigate elsewhere using the menu.
          </Text>
          <Flex justifyContent="center">
            <Button onClick={onRetry} variant="secondary">Try again</Button>
          </Flex>
        </Panel>
      </Box>
    </Flex>
  );
}
