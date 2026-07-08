"use client";

import { Button, Dropdown, DropdownLinkItem, MoreHorizIcon } from "@/components/ui/big-design";
import { Customer } from "@/lib/customers/types";

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
