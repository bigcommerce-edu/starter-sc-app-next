import { GiftCertificateListView } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificate-list-view";
import { getDataMode } from "@/lib/api-client/get-api-client";
import { getStoreCredentials } from "@/lib/api-client/store-credentials";
import { assertStoreHashForDataMode } from "@/lib/routing/assert-store-hash";

export async function GiftCertificatesPage({
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

  // Reading credentials here (rather than inside GiftCertificateListView) is
  // the dynamic read that opts this page out of the Next.js cache pattern —
  // MULTITENANT's session lookup depends on request-specific data, so it
  // can't happen inside a component that might get cached.
  const apiCredentials = getStoreCredentials(urlStoreHashString);

  return (
    <GiftCertificateListView
      searchParams={resolvedSearchParams}
      urlStoreHash={urlStoreHashString}
      apiCredentials={apiCredentials}
    />
  );
}
