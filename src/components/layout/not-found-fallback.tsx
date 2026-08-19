"use client";

import { useParams } from "next/navigation";
import { Box } from "@/components/ui/box";
import { Flex } from "@/components/ui/flex";
import { Panel } from "@/components/ui/panel";
import { H1, Text } from "@/components/ui/text";
import { BaselineHelpIcon } from "@/components/ui/icons";
import { AppLink } from "@/components/ui/app-link";
import { getAppUrl } from "@/lib/routing/app-url";

// TODO: convert this file's imports to the BigDesign barrels, same pattern
// as error-fallback.tsx - also change BaselineHelpIcon's color from
// "secondary60" to "secondary50", matching real BigDesign's icon palette
//
// Shared rendering for every not-found.tsx in the app. storeHash is read via
// useParams() rather than a prop, since not-found.tsx is rendered by Next
// without route params passed to it — hence the Client Component.
export function NotFoundFallback() {
  const params = useParams<{ storeHash?: string }>();
  const storeHash = params.storeHash;

  return (
    <Flex justifyContent="center" paddingVertical="xxxLarge">
      <Box style={{ maxWidth: "560px", width: "100%" }}>
        <Panel>
          <Flex flexDirection="column" alignItems="center" marginBottom="medium">
            <BaselineHelpIcon color="secondary60" size="xLarge" />
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
