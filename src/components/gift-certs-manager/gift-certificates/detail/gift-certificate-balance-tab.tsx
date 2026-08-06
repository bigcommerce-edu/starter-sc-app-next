"use client";

import { Box, Panel, Small, Text } from "@bigcommerce/big-design";
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
  //  - Dismissing the confirmation (Cancel, Esc, the close button) should
  //    abandon the whole action: collapse the open amount panel and reseed
  //    its amount from the certificate. Confirming must not do that - the
  //    amount is read inside the transition, so resetting first would
  //    submit the wrong value

  return (
    <Panel header={giftCertificate.code}>
      <DetailField label="Original Value">{currencyFormatter.format(giftCertificate.amount)}</DetailField>
      <DetailField label="Current Balance">{currencyFormatter.format(giftCertificate.balance)}</DetailField>

      {/* TODO: Add action buttons and panels - the panel's submit button
          should stay disabled until its amount is filled in and, for Refill,
          is above the current balance, so the action can't be sent in a state
          the server will just reject */}
    </Panel>
  );
}
