import Image from "next/image";
import { Box, Flex, H4, Link, Panel, Small, Text } from "@/components/ui/big-design";
import { BaselineHelpIcon } from "@/components/ui/big-design-icons";

const DEVELOPER_LOGO_FILENAME = process.env.DEVELOPER_LOGO_FILENAME || "developer-logo.svg";
const DEVELOPER_NAME = process.env.DEVELOPER_NAME || "Developer Name";
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@developer.dev";
const SUPPORT_URL = process.env.SUPPORT_URL || "https://developer.dev/support";
const SUPPORT_PHONE = process.env.SUPPORT_PHONE || "+1 (555) 010-0142";

export function DeveloperInfoPanel() {
  return (
    <Panel>
      <Flex flexDirection="column" alignItems="center" marginBottom="large">
        <Image
          src={`/${DEVELOPER_LOGO_FILENAME}`}
          alt={`${DEVELOPER_NAME} logo`}
          width={40}
          height={40}
        />
        <H4 marginTop="small" marginBottom="none">
          {DEVELOPER_NAME}
        </H4>
      </Flex>

      <Box marginBottom="medium">
        <Flex alignItems="center" marginBottom="xSmall">
          <BaselineHelpIcon color="secondary60" size="small" />
          <Small marginLeft="xSmall" marginBottom="none">
            Support
          </Small>
        </Flex>
        <Text marginBottom="none">
          <Link href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</Link>
        </Text>
        <Text marginBottom="none">
          <Link href={`tel:${SUPPORT_PHONE}`}>{SUPPORT_PHONE}</Link>
        </Text>
        <Text marginBottom="none">
          <Link href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
            Help Center
          </Link>
        </Text>
      </Box>
    </Panel>
  );
}
