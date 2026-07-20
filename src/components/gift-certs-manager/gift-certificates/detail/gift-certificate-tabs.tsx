"use client";

import { useState } from "react";
import { Box, Tabs } from "@/components/ui/big-design";
import { GiftCertificateBalanceTab } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-balance-tab";
import { GiftCertificateDetailsTab } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-details-tab";
import { GiftCertificateWithAccounts } from "@/lib/gift-certs-manager/gift-certificates/types";

// ariaControls must match the id on the panel each tab renders below —
// without it, BigDesign falls back to looking for an element with id
// "{tab.id}-content" and warns to the console when it can't find one.
const TAB_ITEMS = [
  { id: "details", title: "Details", ariaControls: "details-content" },
  { id: "balance", title: "Balance", ariaControls: "balance-content" },
];

export function GiftCertificateTabs({
  giftCertificate,
  storeHash,
}: {
  giftCertificate: GiftCertificateWithAccounts;
  storeHash: string | undefined;
}) {
  const [activeTab, setActiveTab] = useState("details");

  return (
    <>
      <Tabs activeTab={activeTab} items={TAB_ITEMS} onTabClick={setActiveTab} />
      {activeTab === "details" ? (
        <Box id="details-content">
          <GiftCertificateDetailsTab
            giftCertificate={giftCertificate}
            key={`${giftCertificate.id}-${giftCertificate.status}`}
            storeHash={storeHash}
          />
        </Box>
      ) : (
        <Box id="balance-content">
          <GiftCertificateBalanceTab
            giftCertificate={giftCertificate}
            key={`${giftCertificate.id}-${giftCertificate.balance}`}
            storeHash={storeHash}
          />
        </Box>
      )}
    </>
  );
}
