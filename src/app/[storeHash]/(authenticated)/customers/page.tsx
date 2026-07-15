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
    <Suspense fallback={<ContentFallback />}>
      <CustomersPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}
