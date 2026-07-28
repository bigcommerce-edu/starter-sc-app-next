import { Suspense } from "react";
import { GiftCertificatesPage } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificates-page";
import { AuthorizedPage } from "@/components/layout/authorized-page";
import { ContentFallback } from "@/components/layout/content-fallback";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ContentFallback />}>
      {/* Content fallback because AuthorizedPage must perform auth check based on session cookie */}
      <AuthorizedPage params={params} searchParams={searchParams} pageComponent={GiftCertificatesPage} />
    </Suspense>
  );
}
