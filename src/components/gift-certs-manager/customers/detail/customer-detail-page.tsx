import { CustomerView } from "@/components/gift-certs-manager/customers/detail/customer-view";
import { ContentFallback } from "@/components/layout/content-fallback";
import { Suspense } from "react";

export async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const id = resolvedParams.id;
  const idString = Array.isArray(id) ? id[0] : id;

  const storeHash = resolvedParams.storeHash;
  const storeHashString = Array.isArray(storeHash) ? storeHash[0] : storeHash;

  return (
    <Suspense fallback={<ContentFallback />}>
      {/* Content fallback because CustomerView must perform data fetching */}
      <CustomerView id={idString ?? ""} searchParams={resolvedSearchParams} storeHash={storeHashString} />
    </Suspense>
  );
}
