import { Box, Panel, Small, Text } from "@/components/ui/big-design";

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box marginBottom="medium">
      <Small marginBottom="none">{label}</Small>
      <Text marginBottom="none">{children}</Text>
    </Box>
  );
}

// No registered-customer-account info yet - that needs the customers
// enhancement.
export function GiftCertificatePartyPanel({
  header,
  name,
  email,
}: {
  header: string;
  name: string;
  email: string;
}) {
  return (
    <Panel header={header}>
      <DetailField label="Name on Certificate">{name}</DetailField>
      <DetailField label="Email">{email}</DetailField>
    </Panel>
  );
}
