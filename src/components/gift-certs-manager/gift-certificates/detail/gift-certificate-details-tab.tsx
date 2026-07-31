"use client";

import { useState, useTransition } from "react";
import { Button, Flex, FlexItem, Modal, Text } from "@/components/ui/big-design";
import { updateGiftCertificateStatus } from "@/app/store/[storeHash]/gift-certs/[id]/actions";
import { GiftCertificatePartyPanel } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-party-panel";
import { GiftCertificateStatusPanel } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-status-panel";
import { runServerAction } from "@/components/ui/action-alerts";
import { GIFT_CERTIFICATE_STATUS_LABEL } from "@/lib/gift-certs-manager/gift-certificates/status";
import { GiftCertificateStatus, GiftCertificateWithAccounts } from "@/lib/gift-certs-manager/gift-certificates/types";

// Seeding status from props only works because the caller re-keys this
// component on giftCertificate.status, forcing a remount whenever a status
// update revalidates the certificate — otherwise this would go stale (see
// gift-certificate-balance-tab.tsx for the same pattern).
export function GiftCertificateDetailsTab({
  giftCertificate,
  storeHash,
}: {
  giftCertificate: GiftCertificateWithAccounts;
  storeHash: string | undefined;
}) {
  const [status, setStatus] = useState<GiftCertificateStatus>(giftCertificate.status);
  const [isPending, startTransition] = useTransition();
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const isDirty = status !== giftCertificate.status;

  const resetStatus = () => setStatus(giftCertificate.status);

  // Dismissing the confirmation (Cancel, Esc, the close button) abandons the
  // edit entirely rather than just hiding the dialog: the Select goes back to
  // the certificate's saved status, which in turn re-disables the in-page
  // Cancel/Update Status buttons via isDirty. Leaving the pending status
  // selected would show a form that looks submittable but whose confirmation
  // the user just declined.
  const dismissUpdateModal = () => {
    setIsUpdateModalOpen(false);
    resetStatus();
  };

  // The success path deliberately does not reset: giftCertificate.status is
  // still the pre-update value here, so resetting would briefly show the old
  // status before the revalidated data arrives and remounts this component
  // (see the key in gift-certificate-tabs.tsx).
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
          isRecipient
          storeHash={storeHash}
        />
      </FlexItem>

      <FlexItem>
        <Flex flexGap="0.5rem">
          <Button disabled={!isDirty || isPending} onClick={resetStatus} variant="subtle">
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
          { text: "Cancel", variant: "subtle", onClick: dismissUpdateModal },
          { text: "Update Status", variant: "primary", isLoading: isPending, onClick: handleUpdate },
        ]}
        closeOnEscKey
        header="Update Status"
        isOpen={isUpdateModalOpen}
        onClose={dismissUpdateModal}
      >
        <Text marginBottom="none">
          Update status from {GIFT_CERTIFICATE_STATUS_LABEL[giftCertificate.status]} to{" "}
          {GIFT_CERTIFICATE_STATUS_LABEL[status]}?
        </Text>
      </Modal>
    </Flex>
  );
}
