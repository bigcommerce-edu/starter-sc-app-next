import { Flex, ProgressCircle } from "@/components/ui/big-design";

// Shared Suspense fallback for any content area waiting on a server render.
export function ContentFallback() {
  return (
    <Flex justifyContent="center" paddingVertical="xxxLarge">
      <ProgressCircle size="large" />
    </Flex>
  );
}
