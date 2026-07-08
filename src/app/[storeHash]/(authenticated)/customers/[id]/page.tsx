import { Suspense } from "react";
import { CustomerDetailPage } from "@/components/customers/detail/customer-detail-page";
import { CustomersFallback } from "@/components/customers/customers-fallback";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<CustomersFallback />}>
      <CustomerDetailPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}
