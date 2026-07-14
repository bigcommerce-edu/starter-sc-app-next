import { Suspense } from "react";
import { GiftCertificatesFallback } from "@/components/gift-certs-manager/gift-certificates/gift-certificates-fallback";
import { GiftCertificatesPage } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificates-page";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<GiftCertificatesFallback />}>
      <GiftCertificatesPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}
