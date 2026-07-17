"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownItem, DropdownLinkItem } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { MoreHorizIcon } from "@/components/ui/icons";
import {
  refillGiftCertificateBalance,
  transferGiftCertificateBalanceToStoreCredit,
} from "@/app/[storeHash]/gift-certs/[id]/actions";
import { runServerAction } from "@/components/ui/action-alerts";
import { GiftCertificateWithRecipientAccount } from "@/lib/gift-certs-manager/gift-certificates/types";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type PendingAction = "refill" | "transfer";

const ACTION_LABEL: Record<PendingAction, string> = {
  refill: "Refill",
  transfer: "Transfer to Credit",
};

function getConfirmationMessage(action: PendingAction, certificate: GiftCertificateWithRecipientAccount): string {
  switch (action) {
    case "refill":
      return `Refill balance to ${currencyFormatter.format(certificate.amount)}?`;
    case "transfer": {
      const recipientDisplayName = certificate.recipientAccount
        ? `${certificate.recipientAccount.first_name} ${certificate.recipientAccount.last_name}`
        : certificate.to_name;

      return `Transfer ${currencyFormatter.format(certificate.balance)} to ${recipientDisplayName}'s customer store credit balance?`;
    }
  }
}

export function GiftCertificateActionsMenu({
  certificate,
  detailUrl,
  storeHash,
}: {
  certificate: GiftCertificateWithRecipientAccount;
  detailUrl: string;
  storeHash: string | undefined;
}) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isPending, startTransition] = useTransition();

  const closeModal = () => setPendingAction(null);

  const handleConfirm = () => {
    const action = pendingAction;

    startTransition(async () => {
      switch (action) {
        case "refill":
          await runServerAction(() => refillGiftCertificateBalance(certificate.id, certificate.amount, storeHash));
          break;
        case "transfer":
          await runServerAction(() =>
            transferGiftCertificateBalanceToStoreCredit(certificate.id, certificate.balance, storeHash),
          );
          break;
      }

      closeModal();
    });
  };

  const items: Array<DropdownItem | DropdownLinkItem> = [
    {
      type: "link",
      content: "View",
      url: detailUrl,
    },
    {
      content: "Refill",
      disabled:
        certificate.balance >= certificate.amount ||
        certificate.status === "pending" ||
        certificate.status === "disabled",
      onItemClick: () => setPendingAction("refill"),
    },
    {
      content: "Transfer to Credit",
      disabled: !certificate.recipientAccount || certificate.balance <= 0 || certificate.status !== "active",
      onItemClick: () => setPendingAction("transfer"),
    },
  ];

  return (
    <>
      <Dropdown
        items={items}
        maxHeight={250}
        placement="bottom-end"
        toggle={
          <Button
            aria-label={`Actions for ${certificate.code}`}
            iconOnly={<MoreHorizIcon />}
            variant="subtle"
          />
        }
      />

      {pendingAction && (
        <Modal
          actions={[
            { text: "Cancel", variant: "subtle", onClick: closeModal },
            {
              text: ACTION_LABEL[pendingAction],
              variant: "primary",
              isLoading: isPending,
              onClick: handleConfirm,
            },
          ]}
          closeOnEscKey
          header={ACTION_LABEL[pendingAction]}
          isOpen
          onClose={closeModal}
        >
          <Text marginBottom="none">{getConfirmationMessage(pendingAction, certificate)}</Text>
        </Modal>
      )}
    </>
  );
}
