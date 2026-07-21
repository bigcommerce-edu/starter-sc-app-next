import { Suspense } from "react";
import { CustomerDetailPage } from "@/components/gift-certs-manager/customers/detail/customer-detail-page";
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
      <AuthorizedPage params={params} searchParams={searchParams} pageComponent={CustomerDetailPage} />
    </Suspense>
  );
}
