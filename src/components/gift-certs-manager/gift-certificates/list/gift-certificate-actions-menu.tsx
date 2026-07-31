"use client";

import { useState, useTransition } from "react";
import { Button, Dropdown, DropdownItem, DropdownLinkItem, Modal, Text } from "@/components/ui/big-design";
import { MoreHorizIcon } from "@/components/ui/big-design-icons";
import { refillGiftCertificateBalance } from "@/app/store/[storeHash]/gift-certs/[id]/actions";
import { runServerAction } from "@/components/ui/action-alerts";
import { canRefill } from "@/lib/gift-certs-manager/gift-certificates/status";
import { GiftCertificate } from "@/lib/gift-certs-manager/gift-certificates/types";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// No Transfer to Credit yet — that needs a registered customer account,
// added by a later step.
export function GiftCertificateActionsMenu({
  certificate,
  detailUrl,
  storeHash,
}: {
  certificate: GiftCertificate;
  detailUrl: string;
  storeHash: string | undefined;
}) {
  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Bumped on every selection to force Dropdown (downshift's useSelect
  // underneath) to remount with a fresh internal reducer. Without this,
  // downshift's stale internal selectedItem state can re-fire
  // onSelectedItemChange against new items/onItemClick closures on a later
  // re-render, re-invoking the same onItemClick with no actual click.
  const [dropdownKey, setDropdownKey] = useState(0);

  const closeModal = () => setIsRefillModalOpen(false);

  const handleConfirm = () => {
    closeModal();

    startTransition(async () => {
      await runServerAction(() => refillGiftCertificateBalance(certificate.id, certificate.amount, storeHash));
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
      disabled: !canRefill(certificate),
      onItemClick: () => {
        setIsRefillModalOpen(true);
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

      {isRefillModalOpen && (
        <Modal
          actions={[
            { text: "Cancel", variant: "subtle", onClick: closeModal },
            {
              text: "Refill",
              variant: "primary",
              isLoading: isPending,
              onClick: handleConfirm,
            },
          ]}
          closeOnEscKey
          header="Refill"
          isOpen
          onClose={closeModal}
        >
          <Text marginBottom="none">Refill balance to {currencyFormatter.format(certificate.amount)}?</Text>
        </Modal>
      )}
    </>
  );
}
