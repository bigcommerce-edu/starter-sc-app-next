import { Badge, Box, Panel, Small, Text } from "@/components/ui/big-design";
import { Customer } from "@/lib/customers/types";

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
  account: Customer | undefined;
}

export function GiftCertificatePartyPanel({ header, name, email, account }: GiftCertificatePartyPanelProps) {
  return (
    <Panel header={header}>
      <DetailField label="Name on Certificate">{name}</DetailField>
      <DetailField label="Email">{email}</DetailField>
      <DetailField label="Registered Customer">
        <Badge label={account ? "Yes" : "No"} variant={account ? "success" : "secondary"} />
      </DetailField>
      {account && <DetailField label="Account Name">{`${account.firstName} ${account.lastName}`}</DetailField>}
    </Panel>
  );
}
