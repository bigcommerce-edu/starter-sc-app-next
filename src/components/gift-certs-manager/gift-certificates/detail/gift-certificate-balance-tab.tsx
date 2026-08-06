"use client";

import { Box, Panel, Small, Text } from "@/components/ui/big-design";
import { GiftCertificate } from "@/lib/gift-certs-manager/gift-certificates/types";

// TODO: Action type and label constants

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box marginBottom="medium">
      <Small marginBottom="none">{label}</Small>
      <Text marginBottom="none">{children}</Text>
    </Box>
  );
}

// TODO: Add getConfirmationMessage function

// No Transfer to Store Credit yet — that needs a registered customer
// account, added by a later enhancement.
//
// Seeding refillAmount from props only works because the caller re-keys
// this component on giftCertificate.balance, forcing a remount (and fresh
// useState initializers) whenever a balance action revalidates the
// certificate — otherwise this would go stale after a successful
// refill/add.
export function GiftCertificateBalanceTab({
  giftCertificate,
  storeHash,
}: {
  giftCertificate: GiftCertificate;
  storeHash: string | undefined;
}) {
  // TODO: Add state values for selected and pending action, refill amount, and transition

  // TODO: toggleAction function

  // TODO: Handle action confirmation

  return (
    <Panel header={giftCertificate.code}>
      <DetailField label="Original Value">{currencyFormatter.format(giftCertificate.amount)}</DetailField>
      <DetailField label="Current Balance">{currencyFormatter.format(giftCertificate.balance)}</DetailField>

      {/* TODO: Add action buttons and panels */}
    </Panel>
  );
}
