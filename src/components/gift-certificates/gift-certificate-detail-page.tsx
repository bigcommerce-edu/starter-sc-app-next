import { GiftCertificateDetailView } from "@/components/gift-certificates/gift-certificate-detail-view";

const ARTIFICIAL_DELAY_MS = 2000;

export async function GiftCertificateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await params;
  await searchParams;
  await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_DELAY_MS));

  const id = resolvedParams.id;
  const idString = Array.isArray(id) ? id[0] : id;

  return <GiftCertificateDetailView id={idString ?? ""} />;
}
