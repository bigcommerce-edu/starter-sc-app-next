import { Box, Button, Flex, H1, Panel, Text } from "@/components/ui/big-design";

export default function Home() {
  return (
    <Flex justifyContent="center" paddingVertical="xxxLarge">
      <Box marginHorizontal="auto" style={{ maxWidth: "480px", width: "100%" }}>
        <Panel header="Welcome">
          <H1>Home page placeholder</H1>
          <Text marginBottom="large">
            This is a starting point built with BigCommerce BigDesign components.
          </Text>
          <Button>Get started</Button>
        </Panel>
      </Box>
    </Flex>
  );
}
