import { Suspense } from "react";
import { CustomersFallback } from "@/components/gift-certs-manager/customers/customers-fallback";
import { CustomersPage } from "@/components/gift-certs-manager/customers/list/customers-page";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<CustomersFallback />}>
      <CustomersPage params={params} searchParams={searchParams} />
    </Suspense>
  );
}
