import { GiftCertificateListView } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificate-list-view";

export async function GiftCertificatesPage({
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

  return <GiftCertificateListView searchParams={resolvedSearchParams} storeHash={storeHashString} />;
}
