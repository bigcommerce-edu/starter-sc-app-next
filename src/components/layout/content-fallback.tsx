// TODO: Import Flex/ProgressCircle from @/components/ui/big-design instead
import { Flex } from "@/components/ui/flex";
import { ProgressCircle } from "@/components/ui/progress-circle";

// TODO: Convert this to BigDesign layout
export function ContentFallback() {
  return (
    <Flex justifyContent="center" paddingVertical="xxxLarge">
      <ProgressCircle size="large" />
    </Flex>
  );
}
