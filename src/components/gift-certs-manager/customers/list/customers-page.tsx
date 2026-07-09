import { CustomerListView } from "@/components/gift-certs-manager/customers/list/customer-list-view";
import { getDataMode } from "@/lib/api-client/get-api-client";
import { getStoreCredentials } from "@/lib/api-client/store-credentials";
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

  const urlStoreHash = resolvedParams.storeHash;
  const urlStoreHashString = Array.isArray(urlStoreHash) ? urlStoreHash[0] : urlStoreHash;

  const dataMode = getDataMode();

  assertStoreHashForDataMode(dataMode, urlStoreHashString);

  const apiCredentials = getStoreCredentials(urlStoreHashString);

  return (
    <CustomerListView
      searchParams={resolvedSearchParams}
      urlStoreHash={urlStoreHashString}
      apiCredentials={apiCredentials}
    />
  );
}
