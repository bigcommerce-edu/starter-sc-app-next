import { Box, Panel, Small, Text } from "@/components/ui/big-design";

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box marginBottom="medium">
      <Small marginBottom="none">{label}</Small>
      <Text marginBottom="none">{children}</Text>
    </Box>
  );
}

// TODO: Move props interface into GiftCertificatePartyPanelProps type

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
      {/* TODO: Replace simple email with full customer info */}
      <DetailField label="Email">{email}</DetailField>
    </Panel>
  );
}
