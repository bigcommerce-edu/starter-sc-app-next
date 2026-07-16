import { Suspense } from "react";
import { GiftCertificatesPage } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificates-page";
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
      {/* Simple Suspense boundary, no fallback, because GiftCertificatesPage un-packs request params */}
      <GiftCertificatesPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}
