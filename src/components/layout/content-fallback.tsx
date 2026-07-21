import { Flex, ProgressCircle } from "@/components/ui/big-design";

// Shared Suspense fallback for any content area waiting on a server render —
// the [storeHash]/(root) layout's outer content boundary (covers the
// authenticated-route session check plus whatever page is loading under it)
// and each feature's own inner boundary (e.g. gift certificates, customers)
// all show the same thing, so there's no reason for each to declare its own
// copy.
export function ContentFallback() {
  return (
    <Flex justifyContent="center" paddingVertical="xxxLarge">
      <ProgressCircle size="large" />
    </Flex>
  );
}
