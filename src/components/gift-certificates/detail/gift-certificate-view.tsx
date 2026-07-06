import { GiftCertificateTabs } from "@/components/gift-certificates/detail/gift-certificate-tabs";
import { fetchGiftCertificate } from "@/lib/gift-certificates/gift-certificates-api";

export async function GiftCertificateView({ id }: { id: string }) {
  const giftCertificate = await fetchGiftCertificate(id);

  return <GiftCertificateTabs giftCertificate={giftCertificate} />;
}
