import { CustomerListView } from "@/components/gift-certs-manager/customers/list/customer-list-view";
import { getDataMode } from "@/lib/api-client/get-api-client";
import { assertStoreHashForDataMode } from "@/lib/routing/assert-store-hash";

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

  assertStoreHashForDataMode(getDataMode(), storeHashString);

  return <CustomerListView searchParams={resolvedSearchParams} storeHash={storeHashString} />;
}
