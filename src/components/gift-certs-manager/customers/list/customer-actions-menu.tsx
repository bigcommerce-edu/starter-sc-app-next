"use client";

import { Button } from "@/components/ui/button";
import { Dropdown, DropdownLinkItem } from "@/components/ui/dropdown";
import { MoreHorizIcon } from "@/components/ui/icons";
import { Customer } from "@/lib/gift-certs-manager/customers/types";

export function CustomerActionsMenu({ customer, detailUrl }: { customer: Customer; detailUrl: string }) {
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
          aria-label={`Actions for ${customer.first_name} ${customer.last_name}`}
          iconOnly={<MoreHorizIcon />}
          variant="subtle"
        />
      }
    />
  );
}
