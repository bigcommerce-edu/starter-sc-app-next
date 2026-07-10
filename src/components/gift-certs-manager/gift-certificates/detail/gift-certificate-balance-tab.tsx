"use client";

import { useState, useTransition } from "react";
import { Box, Button, Flex, Input, Modal, Panel, Small, Text } from "@/components/ui/big-design";
import {
  addToGiftCertificateBalance,
  refillGiftCertificateBalance,
  transferGiftCertificateBalanceToStoreCredit,
} from "@/app/[storeHash]/(authenticated)/gift-certs/[id]/actions";
import { runServerAction } from "@/components/ui/action-alerts";
import { GiftCertificateWithAccounts } from "@/lib/gift-certs-manager/gift-certificates/types";

type BalanceAction = "refill" | "add" | "transfer";

const ACTION_LABEL: Record<BalanceAction, string> = {
  refill: "Refill",
  add: "Add to Balance",
  transfer: "Transfer to Store Credit",
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

function getConfirmationMessage(action: BalanceAction, giftCertificate: GiftCertificateWithAccounts, amount: number): string {
  switch (action) {
    case "refill":
      return `Refill balance to ${currencyFormatter.format(amount)}?`;
    case "add":
      return `Add ${currencyFormatter.format(amount)} to the current balance?`;
    case "transfer": {
      const recipientDisplayName = giftCertificate.recipientAccount
        ? `${giftCertificate.recipientAccount.first_name} ${giftCertificate.recipientAccount.last_name}`
        : giftCertificate.to_name;

      return `Transfer ${currencyFormatter.format(amount)} to ${recipientDisplayName}'s customer store credit balance?`;
    }
  }
}

// Seeding refillAmount/transferAmount from props only works because the
// caller re-keys this component on giftCertificate.balance, forcing a
// remount (and fresh useState initializers) whenever a balance action
// revalidates the certificate — otherwise these would go stale after a
// successful refill/add/transfer.
export function GiftCertificateBalanceTab({
  giftCertificate,
  urlStoreHash,
}: {
  giftCertificate: GiftCertificateWithAccounts;
  urlStoreHash: string | undefined;
}) {
  const [selectedAction, setSelectedAction] = useState<BalanceAction | null>(null);
  const [pendingAction, setPendingAction] = useState<BalanceAction | null>(null);
  const [refillAmount, setRefillAmount] = useState(String(giftCertificate.amount));
  const [addAmount, setAddAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState(String(giftCertificate.balance));
  const [isPending, startTransition] = useTransition();

  const toggleAction = (action: BalanceAction) => {
    setSelectedAction((current) => (current === action ? null : action));
  };

  const closeConfirmModal = () => setPendingAction(null);

  const handleConfirm = () => {
    const action = pendingAction;

    startTransition(async () => {
      switch (action) {
        case "refill":
          await runServerAction(() =>
            refillGiftCertificateBalance(giftCertificate.id, Number(refillAmount), urlStoreHash),
          );
          break;
        case "add":
          await runServerAction(() =>
            addToGiftCertificateBalance(giftCertificate.id, Number(addAmount), urlStoreHash),
          );
          break;
        case "transfer":
          await runServerAction(() =>
            transferGiftCertificateBalanceToStoreCredit(giftCertificate.id, Number(transferAmount), urlStoreHash),
          );
          break;
      }

      closeConfirmModal();
    });
  };

  const pendingAmount = pendingAction === "refill" ? refillAmount : pendingAction === "add" ? addAmount : transferAmount;

  return (
    <Panel header={giftCertificate.code}>
      <DetailField label="Original Value">{currencyFormatter.format(giftCertificate.amount)}</DetailField>
      <DetailField label="Current Balance">{currencyFormatter.format(giftCertificate.balance)}</DetailField>

      <Flex flexGap="0.5rem" marginBottom="medium">
        <Button
          disabled={giftCertificate.status === "pending" || giftCertificate.status === "disabled"}
          onClick={() => toggleAction("refill")}
          variant={selectedAction === "refill" ? "primary" : "secondary"}
        >
          Refill
        </Button>
        <Button
          disabled={giftCertificate.status === "pending" || giftCertificate.status === "disabled"}
          onClick={() => toggleAction("add")}
          variant={selectedAction === "add" ? "primary" : "secondary"}
        >
          Add to Balance
        </Button>
        <Button
          disabled={
            !giftCertificate.recipientAccount ||
            giftCertificate.balance <= 0 ||
            giftCertificate.status !== "active"
          }
          onClick={() => toggleAction("transfer")}
          variant={selectedAction === "transfer" ? "primary" : "secondary"}
        >
          Transfer to Store Credit
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
            This will set the total active balance to this amount, up to{" "}
            <strong>{currencyFormatter.format(giftCertificate.amount)}</strong>.
          </Text>
          <Button onClick={() => setPendingAction("refill")} variant="primary">
            Refill
          </Button>
        </Box>
      )}

      {selectedAction === "add" && (
        <Box>
          <Input label="Amount" onChange={(event) => setAddAmount(event.target.value)} type="number" value={addAmount} />
          <Text>This amount will be added to the current balance.</Text>
          <Button disabled={addAmount === ""} onClick={() => setPendingAction("add")} variant="primary">
            Add to Balance
          </Button>
        </Box>
      )}

      {selectedAction === "transfer" && (
        <Box>
          <Input
            label="Amount to Transfer"
            onChange={(event) => setTransferAmount(event.target.value)}
            type="number"
            value={transferAmount}
          />
          <Text>
            The gift certificate balance will be reduced by this amount, and the customer&apos;s store credit
            balance will be increased accordingly.
          </Text>
          <Button onClick={() => setPendingAction("transfer")} variant="primary">
            Transfer to Store Credit
          </Button>
        </Box>
      )}

      {pendingAction && (
        <Modal
          actions={[
            { text: "Cancel", variant: "subtle", onClick: closeConfirmModal },
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
          onClose={closeConfirmModal}
        >
          <Text marginBottom="none">
            {getConfirmationMessage(pendingAction, giftCertificate, Number(pendingAmount))}
          </Text>
        </Modal>
      )}
    </Panel>
  );
}
