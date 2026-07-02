import { Suspense } from "react";
import { GiftCertificatesFallback } from "@/components/gift-certificates/gift-certificates-fallback";
import { GiftCertificatesPage } from "@/components/gift-certificates/gift-certificates-page";

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
