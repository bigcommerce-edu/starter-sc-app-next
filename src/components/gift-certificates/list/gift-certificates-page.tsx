import { GiftCertificateListView } from "@/components/gift-certificates/list/gift-certificate-list-view";

const ARTIFICIAL_DELAY_MS = 2000;

export async function GiftCertificatesPage({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_DELAY_MS));

  const storeHash = resolvedParams.storeHash;
  const storeHashString = Array.isArray(storeHash) ? storeHash[0] : storeHash;

  return <GiftCertificateListView searchParams={resolvedSearchParams} storeHash={storeHashString} />;
}
