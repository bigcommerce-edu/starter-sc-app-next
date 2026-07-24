import { Box, Flex, H1, Panel, Text } from "@/components/ui/big-design";
import { ErrorIcon } from "@/components/ui/big-design-icons";

// Rendered by app/unauthorized/page.tsx, which AuthorizedPage redirects to
// when isAuthorizedForStore fails. A dedicated top-level route (outside both
// (root) and [storeHash]) rather than something AuthorizedPage renders
// inline — inline would still be wrapped in [storeHash]/layout.tsx's
// AppShell (nav, banners), since that layout renders AppShell unconditionally
// around children with no way for a nested Server Component to opt out; a
// "not authorized" response should show no site frame at all. Mirrors
// UnauthorizedRootRoute's visual pattern (same MULTITENANT-guard idea,
// different trigger).
export function UnauthorizedStoreRoute() {
  return (
    <Flex justifyContent="center" paddingVertical="xxxLarge">
      <Box style={{ maxWidth: "560px", width: "100%" }}>
        <Panel>
          <Flex flexDirection="column" alignItems="center" marginBottom="medium">
            <ErrorIcon color="danger50" size="xLarge" />
            <H1 marginTop="small" marginBottom="none">
              Not authorized
            </H1>
          </Flex>
          <Text marginBottom="none">
            You are not authorized to access this store. Your session may have expired, or your access may have been
            revoked. Try reloading the app from the BigCommerce control panel.
          </Text>
        </Panel>
      </Box>
    </Flex>
  );
}
