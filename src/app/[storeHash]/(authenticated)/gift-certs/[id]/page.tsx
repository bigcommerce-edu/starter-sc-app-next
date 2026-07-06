import { Suspense } from "react";
import { GiftCertificateDetailPage } from "@/components/gift-certificates/gift-certificate-detail-page";
import { GiftCertificatesFallback } from "@/components/gift-certificates/gift-certificates-fallback";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<GiftCertificatesFallback />}>
      <GiftCertificateDetailPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}
