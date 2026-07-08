import { Box, Panel, Select, Small, Text } from "@/components/ui/big-design";
import { GIFT_CERTIFICATE_STATUSES, GIFT_CERTIFICATE_STATUS_LABEL } from "@/lib/gift-certificates/status";
import { GiftCertificateStatus, GiftCertificateWithAccounts } from "@/lib/gift-certificates/types";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

const STATUS_OPTIONS = GIFT_CERTIFICATE_STATUSES.map((status) => ({
  value: status,
  content: GIFT_CERTIFICATE_STATUS_LABEL[status],
}));

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box marginBottom="medium">
      <Small marginBottom="none">{label}</Small>
      <Text marginBottom="none">{children}</Text>
    </Box>
  );
}

interface GiftCertificateStatusPanelProps {
  giftCertificate: GiftCertificateWithAccounts;
  status: GiftCertificateStatus;
  onStatusChange(status: GiftCertificateStatus): void;
}

export function GiftCertificateStatusPanel({ giftCertificate, status, onStatusChange }: GiftCertificateStatusPanelProps) {
  return (
    <Panel header={giftCertificate.code}>
      <DetailField label="Purchase Date">
        {dateFormatter.format(new Date(Number(giftCertificate.purchase_date) * 1000))}
      </DetailField>
      <DetailField label="Email Template">{giftCertificate.template}</DetailField>
      <DetailField label="Original Value">{currencyFormatter.format(giftCertificate.amount)}</DetailField>

      <Box marginBottom="none">
        <Select
          label="Status"
          onOptionChange={(value) => value && onStatusChange(value)}
          options={STATUS_OPTIONS}
          value={status}
        />
      </Box>
    </Panel>
  );
}
