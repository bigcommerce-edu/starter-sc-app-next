import { Badge, Box, Panel, Small, Text } from "@/components/ui/big-design";

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box marginBottom="medium">
      <Small marginBottom="none">{label}</Small>
      <Text marginBottom="none">{children}</Text>
    </Box>
  );
}

interface GiftCertificatePartyPanelProps {
  header: string;
  name: string;
  email: string;
  hasAccount: boolean;
  accountName?: string;
}

export function GiftCertificatePartyPanel({
  header,
  name,
  email,
  hasAccount,
  accountName,
}: GiftCertificatePartyPanelProps) {
  return (
    <Panel header={header}>
      <DetailField label="Name on Certificate">{name}</DetailField>
      <DetailField label="Email">{email}</DetailField>
      <DetailField label="Registered Customer">
        <Badge label={hasAccount ? "Yes" : "No"} variant={hasAccount ? "success" : "secondary"} />
      </DetailField>
      {hasAccount && <DetailField label="Account Name">{accountName}</DetailField>}
    </Panel>
  );
}
