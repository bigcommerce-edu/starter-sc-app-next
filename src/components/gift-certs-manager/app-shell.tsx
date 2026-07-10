import { Box, Flex, FlexItem } from "@/components/ui/big-design";
import { DataModeBanner } from "@/components/layout/data-mode-banner";
import { DeveloperInfoPanel } from "@/components/layout/developer-info-panel";
import { MainNav } from "@/components/gift-certs-manager/main-nav";

const SIDEBAR_WIDTH = "280px";

// Unpacks storeHash itself (same pattern as every *Page component) rather
// than having each layout that renders this do it and pass the result down —
// so [storeHash]/layout.tsx and (root)/layout.tsx can just forward params
// straight through. The layout wraps this whole component in a Suspense
// boundary, since awaiting params here is itself a dynamic read under
// cacheComponents — but by the time that await resolves and MainNav renders,
// storeHash is already a plain resolved value, not a pending read, so
// MainNav doesn't need (and can't benefit from) a Suspense boundary of its
// own.
export async function AppShell({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const urlStoreHash = resolvedParams.storeHash;
  const urlStoreHashString = Array.isArray(urlStoreHash) ? urlStoreHash[0] : urlStoreHash;

  return (
    <Box>
      <DataModeBanner />
      <Box paddingHorizontal="large" paddingTop="large">
        <MainNav storeHash={urlStoreHashString} />
      </Box>
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
