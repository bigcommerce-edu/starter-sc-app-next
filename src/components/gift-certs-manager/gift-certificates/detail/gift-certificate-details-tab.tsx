"use client";

import { useState } from "react";
import { Flex, FlexItem } from "@bigcommerce/big-design";
import { GiftCertificatePartyPanel } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-party-panel";
import { GiftCertificateStatusPanel } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-status-panel";
import { GiftCertificate, GiftCertificateStatus } from "@/lib/gift-certs-manager/gift-certificates/types";

export function GiftCertificateDetailsTab({
  giftCertificate,
  storeHash,
}: {
  giftCertificate: GiftCertificate;
  storeHash: string | undefined;
}) {
  // TODO: Track dirty state (status !== giftCertificate.status) and add
  // Cancel/Update Status buttons below the panels, with a confirmation
  // modal before calling updateGiftCertificateStatus (the Server Action in
  // this route's actions.ts)
  //  - Dismissing the confirmation (Cancel, Esc, the close button) should
  //    abandon the edit entirely: reset the Select back to the saved
  //    status, which re-disables the in-page buttons via the dirty check.
  //    The success path deliberately does not reset
  const [status, setStatus] = useState<GiftCertificateStatus>(giftCertificate.status);

  return (
    <Flex flexDirection="column" flexGap="1rem">
      <FlexItem>
        <GiftCertificateStatusPanel giftCertificate={giftCertificate} onStatusChange={setStatus} status={status} />
      </FlexItem>
      <FlexItem>
        <GiftCertificatePartyPanel header="Sender" name={giftCertificate.from_name} email={giftCertificate.from_email} />
      </FlexItem>
      <FlexItem>
        <GiftCertificatePartyPanel header="Recipient" name={giftCertificate.to_name} email={giftCertificate.to_email} />
      </FlexItem>

      {/* TODO: Add Update Status panel/confirmation */}
    </Flex>
  );
}
