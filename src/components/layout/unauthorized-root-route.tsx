import { Box } from "@/components/ui/box";
import { Flex } from "@/components/ui/flex";
import { Panel } from "@/components/ui/panel";
import { H1, Text } from "@/components/ui/text";
import { ErrorIcon } from "@/components/ui/icons";

export function UnauthorizedRootRoute() {
  return (
    <Flex justifyContent="center" paddingVertical="xxxLarge">
      <Box style={{ maxWidth: "560px", width: "100%" }}>
        <Panel>
          <Flex flexDirection="column" alignItems="center" marginBottom="medium">
            <ErrorIcon color="danger50" size="xLarge" />
            <H1 marginTop="small" marginBottom="none">
              Unauthorized
            </H1>
          </Flex>
          <Text>
            This page is not accessible when the app is running in multi-tenant mode. Every request in
            multi-tenant mode must include a store hash in the URL and be authenticated accordingly.
          </Text>
          <Text marginBottom="none">
            This root-level route only exists for mock and static-token development. Never deploy the app to
            production with a configuration that serves it.
          </Text>
        </Panel>
      </Box>
    </Flex>
  );
}
