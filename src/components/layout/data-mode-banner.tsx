import { Box, InlineMessage } from "@/components/ui/big-design";
import { getDataMode } from "@/lib/bc-api-client/data-mode";

// TODO: convert this file's imports from box.tsx/inline-message.tsx to the
// BigDesign barrel (@/components/ui/big-design) - no other change needed
const DATA_MODE_LABEL: Record<"MOCK" | "STATIC", string> = {
  MOCK: "mock",
  STATIC: "static token",
};

export function DataModeBanner() {
  const dataMode = getDataMode();

  if (dataMode !== "MOCK" && dataMode !== "STATIC") {
    return null;
  }

  return (
    <Box paddingHorizontal="large" paddingTop="large">
      <InlineMessage
        header={`Data fetching is in ${DATA_MODE_LABEL[dataMode]} mode`}
        messages={[
          {
            text: "All routes are unprotected. Never deploy the app to production in this configuration.",
          },
        ]}
        type="warning"
      />
    </Box>
  );
}
