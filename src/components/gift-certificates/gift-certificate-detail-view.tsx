import { Badge, Box, Panel, Small, Text } from "@/components/ui/big-design";
import { fetchGiftCertificate } from "@/lib/gift-certificates/gift-certificates-api";
import { GiftCertificateStatus } from "@/lib/gift-certificates/types";

const STATUS_BADGE_VARIANT: Record<GiftCertificateStatus, "success" | "secondary" | "warning" | "danger"> = {
  active: "success",
  pending: "warning",
  redeemed: "secondary",
  disabled: "danger",
  expired: "danger",
};

const STATUS_LABEL: Record<GiftCertificateStatus, string> = {
  active: "Active",
  pending: "Pending",
  redeemed: "Redeemed",
  disabled: "Disabled",
  expired: "Expired",
};

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box marginBottom="medium">
      <Small marginBottom="none">{label}</Small>
      <Text marginBottom="none">{children}</Text>
    </Box>
  );
}

export async function GiftCertificateDetailView({ id }: { id: string }) {
  const giftCertificate = await fetchGiftCertificate(id);

  return (
    <Panel header={giftCertificate.certificateNumber}>
      <DetailField label="Status">
        <Badge label={STATUS_LABEL[giftCertificate.status]} variant={STATUS_BADGE_VARIANT[giftCertificate.status]} />
      </DetailField>
      <DetailField label="Original Value">{currencyFormatter.format(giftCertificate.originalValue)}</DetailField>
      <DetailField label="Current Balance">{currencyFormatter.format(giftCertificate.currentBalance)}</DetailField>
      <DetailField label="Recipient">{giftCertificate.recipientName}</DetailField>
      <DetailField label="Recipient Email">{giftCertificate.recipientEmail}</DetailField>
      <DetailField label="Purchase Date">{dateFormatter.format(new Date(giftCertificate.purchaseDate))}</DetailField>
    </Panel>
  );
}
