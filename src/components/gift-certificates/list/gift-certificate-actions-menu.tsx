"use client";

import { Button, Dropdown, DropdownLinkItem, MoreHorizIcon } from "@/components/ui/big-design";
import { GiftCertificate } from "@/lib/gift-certificates/types";

export function GiftCertificateActionsMenu({
  certificate,
  detailUrl,
}: {
  certificate: GiftCertificate;
  detailUrl: string;
}) {
  const items: DropdownLinkItem[] = [
    {
      type: "link",
      content: "View",
      url: detailUrl,
    },
  ];

  return (
    <Dropdown
      items={items}
      maxHeight={250}
      placement="bottom-end"
      toggle={
        <Button
          aria-label={`Actions for ${certificate.certificateNumber}`}
          iconOnly={<MoreHorizIcon />}
          variant="subtle"
        />
      }
    />
  );
}
