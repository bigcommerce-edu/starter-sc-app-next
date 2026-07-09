import { GiftCertificateView } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-view";
import { getStoreCredentials } from "@/lib/api-client/store-credentials";

export async function GiftCertificateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  await searchParams;

  const id = resolvedParams.id;
  const idString = Array.isArray(id) ? id[0] : id;

  const urlStoreHash = resolvedParams.storeHash;
  const urlStoreHashString = Array.isArray(urlStoreHash) ? urlStoreHash[0] : urlStoreHash;

  const apiCredentials = getStoreCredentials(urlStoreHashString);

  return (
    <GiftCertificateView id={idString ?? ""} urlStoreHash={urlStoreHashString} apiCredentials={apiCredentials} />
  );
}
