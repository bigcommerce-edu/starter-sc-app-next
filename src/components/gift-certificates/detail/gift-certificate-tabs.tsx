"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/big-design";
import { GiftCertificateBalanceTab } from "@/components/gift-certificates/detail/gift-certificate-balance-tab";
import { GiftCertificateDetailsTab } from "@/components/gift-certificates/detail/gift-certificate-details-tab";
import { GiftCertificate } from "@/lib/gift-certificates/types";

const TAB_ITEMS = [
  { id: "details", title: "Details" },
  { id: "balance", title: "Balance" },
];

export function GiftCertificateTabs({ giftCertificate }: { giftCertificate: GiftCertificate }) {
  const [activeTab, setActiveTab] = useState("details");

  return (
    <>
      <Tabs activeTab={activeTab} items={TAB_ITEMS} onTabClick={setActiveTab} />
      {activeTab === "details" ? (
        <GiftCertificateDetailsTab giftCertificate={giftCertificate} />
      ) : (
        <GiftCertificateBalanceTab giftCertificate={giftCertificate} />
      )}
    </>
  );
}
