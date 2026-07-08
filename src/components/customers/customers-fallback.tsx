import { Flex, ProgressCircle } from "@/components/ui/big-design";

export function CustomersFallback() {
  return (
    <Flex justifyContent="center" paddingVertical="xxxLarge">
      <ProgressCircle size="large" />
    </Flex>
  );
}
