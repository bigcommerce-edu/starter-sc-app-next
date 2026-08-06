import { GiftCertificatesPage } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificates-page";

// No AuthorizedPage wrapping yet - that lands once session/auth exists.
export default function Page(props: React.ComponentProps<typeof GiftCertificatesPage>) {
  return <GiftCertificatesPage {...props} />;
}
