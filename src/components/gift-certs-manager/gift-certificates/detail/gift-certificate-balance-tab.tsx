"use client";

import { useState, useTransition } from "react";
import { Box, Button, Flex, Input, Panel, Small, Text } from "@/components/ui/big-design";
import {
  addToGiftCertificateBalance,
  refillGiftCertificateBalance,
  transferGiftCertificateBalanceToStoreCredit,
} from "@/app/[storeHash]/(authenticated)/gift-certs/[id]/actions";
import { runServerAction } from "@/components/ui/action-alerts";
import { GiftCertificateWithAccounts } from "@/lib/gift-certs-manager/gift-certificates/types";

type BalanceAction = "refill" | "add" | "transfer";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box marginBottom="medium">
      <Small marginBottom="none">{label}</Small>
      <Text marginBottom="none">{children}</Text>
    </Box>
  );
}

// Seeding refillAmount/transferAmount from props only works because the
// caller re-keys this component on giftCertificate.balance, forcing a
// remount (and fresh useState initializers) whenever a balance action
// revalidates the certificate — otherwise these would go stale after a
// successful refill/add/transfer.
export function GiftCertificateBalanceTab({ giftCertificate }: { giftCertificate: GiftCertificateWithAccounts }) {
  const [selectedAction, setSelectedAction] = useState<BalanceAction | null>(null);
  const [refillAmount, setRefillAmount] = useState(String(giftCertificate.amount));
  const [addAmount, setAddAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState(String(giftCertificate.balance));
  const [isPending, startTransition] = useTransition();

  const toggleAction = (action: BalanceAction) => {
    setSelectedAction((current) => (current === action ? null : action));
  };

  const handleRefill = () => {
    startTransition(async () => {
      await runServerAction(() => refillGiftCertificateBalance(giftCertificate.id, Number(refillAmount)));
    });
  };

  const handleAdd = () => {
    startTransition(async () => {
      await runServerAction(() => addToGiftCertificateBalance(giftCertificate.id, Number(addAmount)));
    });
  };

  const handleTransfer = () => {
    startTransition(async () => {
      await runServerAction(() => transferGiftCertificateBalanceToStoreCredit(giftCertificate.id, Number(transferAmount)));
    });
  };

  return (
    <Panel header={giftCertificate.code}>
      <DetailField label="Original Value">{currencyFormatter.format(giftCertificate.amount)}</DetailField>
      <DetailField label="Current Balance">{currencyFormatter.format(giftCertificate.balance)}</DetailField>

      <Flex flexGap="0.5rem" marginBottom="medium">
        <Button
          onClick={() => toggleAction("refill")}
          variant={selectedAction === "refill" ? "primary" : "secondary"}
        >
          Refill
        </Button>
        <Button onClick={() => toggleAction("add")} variant={selectedAction === "add" ? "primary" : "secondary"}>
          Add to Balance
        </Button>
        <Button
          disabled={!giftCertificate.recipientAccount}
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
          <Button isLoading={isPending} onClick={handleRefill} variant="primary">
            Refill
          </Button>
        </Box>
      )}

      {selectedAction === "add" && (
        <Box>
          <Input label="Amount" onChange={(event) => setAddAmount(event.target.value)} type="number" value={addAmount} />
          <Text>This amount will be added to the current balance.</Text>
          <Button isLoading={isPending} onClick={handleAdd} variant="primary">
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
          <Button isLoading={isPending} onClick={handleTransfer} variant="primary">
            Transfer to Store Credit
          </Button>
        </Box>
      )}
    </Panel>
  );
}
