import { Flex } from "@/components/ui/flex";
import { ProgressCircle } from "@/components/ui/progress-circle";

// Shared Suspense fallback for any content area waiting on a server render.
export function ContentFallback() {
  return (
    <Flex justifyContent="center" paddingVertical="xxxLarge">
      <ProgressCircle size="large" />
    </Flex>
  );
}
