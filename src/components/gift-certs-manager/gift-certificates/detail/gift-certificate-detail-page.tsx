import { GiftCertificateView } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-view";

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

  const storeHash = resolvedParams.storeHash;
  const storeHashString = Array.isArray(storeHash) ? storeHash[0] : storeHash;

  return <GiftCertificateView id={idString ?? ""} storeHash={storeHashString} />;
}
