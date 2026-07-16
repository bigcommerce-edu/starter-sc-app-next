import { Suspense } from "react";
import { CustomerDetailPage } from "@/components/gift-certs-manager/customers/detail/customer-detail-page";
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
      {/* Simple Suspense boundary, no fallback, because CustomerDetailPage un-packs request params */}
      <CustomerDetailPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}
