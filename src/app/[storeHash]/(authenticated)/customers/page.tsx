import { Suspense } from "react";
import { CustomersPage } from "@/components/gift-certs-manager/customers/list/customers-page";
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
      {/* Simple Suspense boundary, no fallback, because CustomersPage un-packs request params */}
      <CustomersPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}
