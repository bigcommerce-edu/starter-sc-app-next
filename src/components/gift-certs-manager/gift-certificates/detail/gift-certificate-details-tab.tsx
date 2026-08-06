"use client";

import { useState, useTransition } from "react";
import { Button, Flex, FlexItem, Modal, Text } from "@/components/ui/big-design";
import { updateGiftCertificateStatus } from "@/app/store/[storeHash]/gift-certs/[id]/actions";
import { GiftCertificatePartyPanel } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-party-panel";
import { GiftCertificateStatusPanel } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-status-panel";
import { runServerAction } from "@/components/ui/action-alerts";
import { GIFT_CERTIFICATE_STATUS_LABEL } from "@/lib/gift-certs-manager/gift-certificates/status";
import { GiftCertificate, GiftCertificateStatus } from "@/lib/gift-certs-manager/gift-certificates/types";

// TODO: import GiftCertificateWithAccounts instead of GiftCertificate, and
// pass giftCertificate.senderAccount/recipientAccount into the two
// GiftCertificatePartyPanel calls below (isRecipient/storeHash on the
// recipient one), now that GiftCertificateView decorates the certificate
// with account info
export function GiftCertificateDetailsTab({
  giftCertificate,
  storeHash,
}: {
  giftCertificate: GiftCertificate;
  storeHash: string | undefined;
}) {
  const [status, setStatus] = useState<GiftCertificateStatus>(giftCertificate.status);
  const [isPending, startTransition] = useTransition();
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const isDirty = status !== giftCertificate.status;

  const handleCancel = () => setStatus(giftCertificate.status);

  const closeUpdateModal = () => setIsUpdateModalOpen(false);

  const handleUpdate = () => {
    startTransition(async () => {
      await runServerAction(() => updateGiftCertificateStatus(giftCertificate.id, status, storeHash));
      closeUpdateModal();
    });
  };

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

      <FlexItem>
        <Flex flexGap="0.5rem">
          <Button disabled={!isDirty || isPending} onClick={handleCancel} variant="subtle">
            Cancel
          </Button>
          <Button
            disabled={!isDirty || isPending}
            onClick={() => setIsUpdateModalOpen(true)}
            variant="primary"
          >
            Update Status
          </Button>
        </Flex>
      </FlexItem>

      <Modal
        actions={[
          { text: "Cancel", variant: "subtle", onClick: closeUpdateModal },
          { text: "Update Status", variant: "primary", isLoading: isPending, onClick: handleUpdate },
        ]}
        closeOnEscKey
        header="Update Status"
        isOpen={isUpdateModalOpen}
        onClose={closeUpdateModal}
      >
        <Text marginBottom="none">
          Update status from {GIFT_CERTIFICATE_STATUS_LABEL[giftCertificate.status]} to{" "}
          {GIFT_CERTIFICATE_STATUS_LABEL[status]}?
        </Text>
      </Modal>
    </Flex>
  );
}
