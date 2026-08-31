"use client";

import { useState, useTransition } from "react";
import { Box, Button, Flex, Input, Modal, Panel, Small, Text } from "@bigcommerce/big-design";
import {
  refillGiftCertificateBalance,
} from "@/app/store/[storeHash]/gift-certs/[id]/actions";
import { runServerAction } from "@/components/ui/action-alerts";
import { canRefill } from "@/lib/gift-certs-manager/gift-certificates/status";
import { GiftCertificate } from "@/lib/gift-certs-manager/gift-certificates/types";

type BalanceAction = "refill";

const ACTION_LABEL: Record<BalanceAction, string> = {
  refill: "Refill",
};

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box marginBottom="medium">
      <Small marginBottom="none">{label}</Small>
      <Text marginBottom="none">{children}</Text>
    </Box>
  );
}

function getConfirmationMessage(action: BalanceAction, amount: number): string {
  switch (action) {
    case "refill":
      return `Refill balance to ${currencyFormatter.format(amount)}?`;
  }
}

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
  const [selectedAction, setSelectedAction] = useState<BalanceAction | null>(null);
  const [pendingAction, setPendingAction] = useState<BalanceAction | null>(null);
  const [refillAmount, setRefillAmount] = useState(String(giftCertificate.amount));
  const [isPending, startTransition] = useTransition();

  const toggleAction = (action: BalanceAction) => {
    setSelectedAction((current) => (current === action ? null : action));
  };

  const closeConfirmModal = () => setPendingAction(null);

  // Dismissing the confirmation (Cancel, Esc, the close button) abandons the
  // whole action, not just the dialog: the open amount panel collapses and
  // its typed value is dropped, so the user isn't left looking at a
  // half-filled form whose confirmation they just declined. The amounts are
  // reseeded from the certificate (the same values useState initialized them
  // with) rather than blanked, so reopening the panel starts from the same
  // defaults as a fresh render.
  const dismissConfirmModal = () => {
    setPendingAction(null);
    setSelectedAction(null);
    setRefillAmount(String(giftCertificate.amount));
  };

  const handleConfirm = () => {
    const action = pendingAction;

    // Closed synchronously on click, not after the action resolves: this
    // component can get frozen mid-transition in Next's client Router Cache,
    // which would otherwise replay a stale pendingAction (and a re-opened
    // modal) when navigating back to this cached page.
    //
    // Deliberately closeConfirmModal, not dismissConfirmModal: the amount
    // state is read inside the transition below, so resetting it here would
    // submit the wrong value. A successful action revalidates and remounts
    // this component (see the key in gift-certificate-tabs.tsx), which is
    // what clears the form on the success path.
    closeConfirmModal();

    startTransition(async () => {
      switch (action) {
        case "refill":
          await runServerAction(() =>
            refillGiftCertificateBalance(giftCertificate.id, Number(refillAmount), storeHash),
          );
          break;
      }
    });
  };

  const pendingAmount = refillAmount;

  const canSubmitRefill = refillAmount !== "" && Number(refillAmount) > giftCertificate.balance;

  return (
    <Panel header={giftCertificate.code}>
      <DetailField label="Original Value">{currencyFormatter.format(giftCertificate.amount)}</DetailField>
      <DetailField label="Current Balance">{currencyFormatter.format(giftCertificate.balance)}</DetailField>

      <Flex flexGap="0.5rem" marginBottom="medium">
        <Button
          disabled={!canRefill(giftCertificate)}
          onClick={() => toggleAction("refill")}
          variant={selectedAction === "refill" ? "primary" : "secondary"}
        >
          Refill
        </Button>
      </Flex>

      {selectedAction === "refill" && (
        <Box>
          <Input
            label="Refill to new balance"
            onChange={(event) => setRefillAmount(event.target.value)}
            type="number"
            value={refillAmount}
          />
          <Text>
            This will set the total active balance to this amount — more than the current balance of{" "}
            <strong>{currencyFormatter.format(giftCertificate.balance)}</strong>, up to{" "}
            <strong>{currencyFormatter.format(giftCertificate.amount)}</strong>.
          </Text>
          <Button disabled={!canSubmitRefill} onClick={() => setPendingAction("refill")} variant="primary">
            Refill
          </Button>
        </Box>
      )}

      {pendingAction && (
        <Modal
          actions={[
            { text: "Cancel", variant: "subtle", onClick: dismissConfirmModal },
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
          onClose={dismissConfirmModal}
        >
          <Text marginBottom="none">{getConfirmationMessage(pendingAction, Number(pendingAmount))}</Text>
        </Modal>
      )}
    </Panel>
  );
}
