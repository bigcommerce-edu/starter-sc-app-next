"use client";

import { useState, useTransition } from "react";
import { Button, Flex, FlexItem, Modal, Text } from "@/components/ui/big-design";
import {
  resendGiftCertificateEmail,
  updateGiftCertificateStatus,
} from "@/app/[storeHash]/(authenticated)/gift-certs/[id]/actions";
import { GiftCertificatePartyPanel } from "@/components/gift-certificates/detail/gift-certificate-party-panel";
import { GiftCertificateStatusPanel } from "@/components/gift-certificates/detail/gift-certificate-status-panel";
import { runServerAction } from "@/components/ui/action-alerts";
import { GiftCertificateStatus, GiftCertificateWithAccounts } from "@/lib/gift-certificates/types";

export function GiftCertificateDetailsTab({ giftCertificate }: { giftCertificate: GiftCertificateWithAccounts }) {
  const [status, setStatus] = useState<GiftCertificateStatus>(giftCertificate.status);
  const [isPending, startTransition] = useTransition();
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);
  const isDirty = status !== giftCertificate.status;

  const handleCancel = () => setStatus(giftCertificate.status);

  const handleUpdate = () => {
    startTransition(async () => {
      await runServerAction(() => updateGiftCertificateStatus(giftCertificate.id, status));
    });
  };

  const closeResendModal = () => setIsResendModalOpen(false);

  const handleResend = () => {
    startTransition(async () => {
      await runServerAction(() => resendGiftCertificateEmail(giftCertificate.id));
      closeResendModal();
    });
  };

  return (
    <Flex flexDirection="column" flexGap="1rem">
      <FlexItem>
        <GiftCertificateStatusPanel giftCertificate={giftCertificate} onStatusChange={setStatus} status={status} />
      </FlexItem>
      <FlexItem>
        <GiftCertificatePartyPanel
          header="Sender"
          name={giftCertificate.from_name}
          email={giftCertificate.from_email}
          account={giftCertificate.senderAccount}
        />
      </FlexItem>
      <FlexItem>
        <GiftCertificatePartyPanel
          header="Recipient"
          name={giftCertificate.to_name}
          email={giftCertificate.to_email}
          account={giftCertificate.recipientAccount}
        />
      </FlexItem>

      <FlexItem>
        <Flex flexGap="0.5rem">
          <Button disabled={!isDirty || isPending} onClick={handleCancel} variant="subtle">
            Cancel
          </Button>
          <Button disabled={!isDirty || isPending} isLoading={isPending} onClick={handleUpdate} variant="primary">
            Update Status
          </Button>
          <Button disabled={isPending} onClick={() => setIsResendModalOpen(true)} variant="secondary">
            Re-send
          </Button>
        </Flex>
      </FlexItem>

      <Modal
        actions={[
          { text: "Cancel", variant: "subtle", onClick: closeResendModal },
          { text: "Re-send", variant: "primary", isLoading: isPending, onClick: handleResend },
        ]}
        closeOnEscKey
        header="Re-send"
        isOpen={isResendModalOpen}
        onClose={closeResendModal}
      >
        <Text marginBottom="none">Re-send gift certificate email to {giftCertificate.to_email}?</Text>
      </Modal>
    </Flex>
  );
}
