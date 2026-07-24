"use client";

import { useState, useTransition } from "react";
import { Button, Dropdown, DropdownItem, DropdownLinkItem, Modal, Text } from "@/components/ui/big-design";
import { MoreHorizIcon } from "@/components/ui/big-design-icons";
import {
  refillGiftCertificateBalance,
  transferGiftCertificateBalanceToStoreCredit,
} from "@/app/store/[storeHash]/gift-certs/[id]/actions";
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
  // Bumped on every selection to force Dropdown (downshift's useSelect
  // underneath) to remount with a fresh internal reducer. Without this,
  // downshift's stale internal selectedItem state can re-fire
  // onSelectedItemChange against new items/onItemClick closures on a later
  // re-render, re-invoking the same onItemClick with no actual click.
  const [dropdownKey, setDropdownKey] = useState(0);

  const closeModal = () => setPendingAction(null);

  const handleConfirm = () => {
    const action = pendingAction;

    // Closed synchronously on click, not after the action resolves — this
    // component can get frozen mid-transition in Next's client Router Cache,
    // which would otherwise replay a stale pendingAction (and a re-opened
    // modal) when navigating back to this cached page.
    closeModal();

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
      onItemClick: () => {
        setPendingAction("refill");
        setDropdownKey((key) => key + 1);
      },
    },
    {
      content: "Transfer to Credit",
      disabled: !certificate.recipientAccount || certificate.balance <= 0 || certificate.status !== "active",
      onItemClick: () => {
        setPendingAction("transfer");
        setDropdownKey((key) => key + 1);
      },
    },
  ];

  return (
    <>
      <Dropdown
        key={dropdownKey}
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
