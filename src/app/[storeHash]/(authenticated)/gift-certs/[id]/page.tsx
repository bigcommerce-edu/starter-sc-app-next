import { Suspense } from "react";
import { GiftCertificateDetailPage } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-detail-page";
import { ContentFallback } from "@/components/layout/content-fallback";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense>
      {/* Simple Suspense boundary, no fallback, because GiftCertificateDetailPage un-packs request params */}
      <GiftCertificateDetailPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}
