import { GiftCertificateDetailPage } from "@/components/gift-certs-manager/gift-certificates/detail/gift-certificate-detail-page";

// No AuthorizedPage wrapping yet - that lands once session/auth exists.
export default function Page(props: React.ComponentProps<typeof GiftCertificateDetailPage>) {
  return <GiftCertificateDetailPage {...props} />;
}
