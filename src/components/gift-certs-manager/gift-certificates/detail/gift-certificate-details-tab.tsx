"use client";

import { useState, useTransition } from "react";
import { Button, Flex, FlexItem, Modal, Text } from "@/components/ui/big-design";
import {
  resendGiftCertificateEmail,
  updateGiftCertificateStatus,
} from "@/app/[storeHash]/(authenticated)/gift-certs/[id]/actions";
import { GiftCertificatePartyPanel } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-party-panel";
import { GiftCertificateStatusPanel } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-status-panel";
import { runServerAction } from "@/components/ui/action-alerts";
import { GIFT_CERTIFICATE_STATUS_LABEL } from "@/lib/gift-certs-manager/gift-certificates/status";
import { GiftCertificateStatus, GiftCertificateWithAccounts } from "@/lib/gift-certs-manager/gift-certificates/types";

// Seeding status from props only works because the caller re-keys this
// component on giftCertificate.status, forcing a remount (and a fresh
// useState initializer) whenever a status update revalidates the
// certificate — otherwise this would go stale after a successful update
// (see gift-certificate-balance-tab.tsx for the same pattern).
export function GiftCertificateDetailsTab({
  giftCertificate,
  urlStoreHash,
}: {
  giftCertificate: GiftCertificateWithAccounts;
  urlStoreHash: string | undefined;
}) {
  const [status, setStatus] = useState<GiftCertificateStatus>(giftCertificate.status);
  const [isPending, startTransition] = useTransition();
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isResendModalOpen, setIsResendModalOpen] = useState(false);
  const isDirty = status !== giftCertificate.status;

  const handleCancel = () => setStatus(giftCertificate.status);

  const closeUpdateModal = () => setIsUpdateModalOpen(false);

  const handleUpdate = () => {
    startTransition(async () => {
      await runServerAction(() => updateGiftCertificateStatus(giftCertificate.id, status, urlStoreHash));
      closeUpdateModal();
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
          <Button
            disabled={!isDirty || isPending}
            onClick={() => setIsUpdateModalOpen(true)}
            variant="primary"
          >
            Update Status
          </Button>
          <Button disabled={isPending} onClick={() => setIsResendModalOpen(true)} variant="secondary">
            Re-send
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
