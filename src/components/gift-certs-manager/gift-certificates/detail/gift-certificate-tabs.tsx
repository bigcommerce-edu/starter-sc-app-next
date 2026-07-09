"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/big-design";
import { GiftCertificateBalanceTab } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-balance-tab";
import { GiftCertificateDetailsTab } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-details-tab";
import { GiftCertificateWithAccounts } from "@/lib/gift-certs-manager/gift-certificates/types";

const TAB_ITEMS = [
  { id: "details", title: "Details" },
  { id: "balance", title: "Balance" },
];

export function GiftCertificateTabs({
  giftCertificate,
  urlStoreHash,
}: {
  giftCertificate: GiftCertificateWithAccounts;
  urlStoreHash: string | undefined;
}) {
  const [activeTab, setActiveTab] = useState("details");

  return (
    <>
      <Tabs activeTab={activeTab} items={TAB_ITEMS} onTabClick={setActiveTab} />
      {activeTab === "details" ? (
        <GiftCertificateDetailsTab giftCertificate={giftCertificate} urlStoreHash={urlStoreHash} />
      ) : (
        <GiftCertificateBalanceTab
          giftCertificate={giftCertificate}
          key={`${giftCertificate.id}-${giftCertificate.balance}`}
        />
      )}
    </>
  );
}
