"use client";

import { useParams } from "next/navigation";
import { Box, Flex, H1, Panel, Text } from "@/components/ui/big-design";
import { BaselineHelpIcon } from "@/components/ui/big-design-icons";
import { AppLink } from "@/components/ui/app-link";
import { getAppUrl } from "@/lib/routing/app-url";

// Shared rendering for every not-found.tsx in the app. storeHash is read via
// useParams() rather than a prop — not-found.tsx is rendered by Next without
// route params passed to it, the same limitation AppExtensionStatusBanner's
// own doc comment describes for a different component, so this is a Client
// Component for the same reason.
export function NotFoundFallback() {
  const params = useParams<{ storeHash?: string }>();
  const storeHash = params.storeHash;

  return (
    <Flex justifyContent="center" paddingVertical="xxxLarge">
      <Box style={{ maxWidth: "560px", width: "100%" }}>
        <Panel>
          <Flex flexDirection="column" alignItems="center" marginBottom="medium">
            <BaselineHelpIcon color="secondary50" size="xLarge" />
            <H1 marginTop="small" marginBottom="none">
              Not found
            </H1>
          </Flex>
          <Text marginBottom="none">
            The page you&rsquo;re looking for doesn&rsquo;t exist, or the record it refers to may have been deleted.{" "}
            <AppLink href={getAppUrl(storeHash, "/")}>Go back home</AppLink>.
          </Text>
        </Panel>
      </Box>
    </Flex>
  );
}
