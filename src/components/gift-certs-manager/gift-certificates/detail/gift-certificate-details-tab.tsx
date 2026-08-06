"use client";

import { useState } from "react";
import { Flex, FlexItem } from "@bigcommerce/big-design";
import { GiftCertificatePartyPanel } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-party-panel";
import { GiftCertificateStatusPanel } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-status-panel";
import { GiftCertificate, GiftCertificateStatus } from "@/lib/gift-certs-manager/gift-certificates/types";

// No Cancel/Update Status buttons yet - that's a later step.
export function GiftCertificateDetailsTab({
  giftCertificate,
  storeHash,
}: {
  giftCertificate: GiftCertificate;
  storeHash: string | undefined;
}) {
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
    </Flex>
  );
}
