import { CustomerListView } from "@/components/gift-certs-manager/customers/list/customer-list-view";
import { ContentFallback } from "@/components/layout/content-fallback";
import { Suspense } from "react";

export async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const storeHash = resolvedParams.storeHash;
  const storeHashString = Array.isArray(storeHash) ? storeHash[0] : storeHash;

  return (
    <Suspense fallback={<ContentFallback />}>
      {/* Content fallback because CustomerListView must perform data fetching */}
      <CustomerListView searchParams={resolvedSearchParams} storeHash={storeHashString} />
    </Suspense>
  );
}
