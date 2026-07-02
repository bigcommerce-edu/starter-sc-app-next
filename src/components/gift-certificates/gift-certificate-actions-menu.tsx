"use client";

import { Button, Dropdown, DropdownItem, MoreHorizIcon } from "@/components/ui/big-design";
import { GiftCertificate } from "@/lib/gift-certificates/types";

export function GiftCertificateActionsMenu({ certificate }: { certificate: GiftCertificate }) {
  const items: DropdownItem[] = [
    {
      content: "View details",
      onItemClick: () => {
        // eslint-disable-next-line no-console
        console.log("View details", certificate.certificateNumber);
      },
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
