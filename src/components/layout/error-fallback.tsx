import { Box, Button, Flex, H1, Panel, Text } from "@/components/ui/big-design";
import { ErrorIcon } from "@/components/ui/big-design-icons";

// Shared rendering for every error.tsx in the app (root-level, [storeHash],
// and per-feature-detail) — each boundary only differs in what "try again"
// means for its own scope (reset() re-renders just that segment), not in
// how the failure looks. Deliberately shows only a fixed, generic message —
// error.tsx receives the real Error object, but per-Next's own production
// behavior that object's message is already stripped to a digest for
// anything not explicitly returned as safe data (see AppError/toSafeMessage)
// — so there is no real detail here worth trying to surface anyway.
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
