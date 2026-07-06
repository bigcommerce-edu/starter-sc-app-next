"use client";

import { useState, useTransition } from "react";
import { Box, Button, Flex, Panel, Select, Small, Text } from "@/components/ui/big-design";
import { updateGiftCertificateStatus } from "@/app/[storeHash]/(authenticated)/gift-certs/[id]/actions";
import { GIFT_CERTIFICATE_STATUSES, GIFT_CERTIFICATE_STATUS_LABEL } from "@/lib/gift-certificates/status";
import { GiftCertificate, GiftCertificateStatus } from "@/lib/gift-certificates/types";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

const STATUS_OPTIONS = GIFT_CERTIFICATE_STATUSES.map((status) => ({
  value: status,
  content: GIFT_CERTIFICATE_STATUS_LABEL[status],
}));

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box marginBottom="medium">
      <Small marginBottom="none">{label}</Small>
      <Text marginBottom="none">{children}</Text>
    </Box>
  );
}

export function GiftCertificateStatusPanel({ giftCertificate }: { giftCertificate: GiftCertificate }) {
  const [status, setStatus] = useState<GiftCertificateStatus>(giftCertificate.status);
  const [isPending, startTransition] = useTransition();
  const isDirty = status !== giftCertificate.status;

  const handleCancel = () => setStatus(giftCertificate.status);

  const handleUpdate = () => {
    startTransition(async () => {
      await updateGiftCertificateStatus(giftCertificate.id, status);
    });
  };

  return (
    <Panel header={giftCertificate.certificateNumber}>
      <DetailField label="Purchase Date">{dateFormatter.format(new Date(giftCertificate.purchaseDate))}</DetailField>
      <DetailField label="Email Template">{giftCertificate.emailTemplate}</DetailField>
      <DetailField label="Original Value">{currencyFormatter.format(giftCertificate.originalValue)}</DetailField>

      <Box marginBottom="medium">
        <Select
          label="Status"
          onOptionChange={(value) => value && setStatus(value)}
          options={STATUS_OPTIONS}
          value={status}
        />
      </Box>

      <Flex flexGap="0.5rem">
        <Button disabled={!isDirty || isPending} isLoading={isPending} onClick={handleUpdate} variant="primary">
          Update Status
        </Button>
        <Button disabled={!isDirty || isPending} onClick={handleCancel} variant="subtle">
          Cancel
        </Button>
      </Flex>
    </Panel>
  );
}
