import { GiftCertificatesPage } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificates-page";
import { AuthorizedPage } from "@/components/layout/authorized-page";

export default function Page({
  params,
  searchParams,
}: {
  params: Promise<Record<string, string | string[] | undefined>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AuthorizedPage params={params} searchParams={searchParams} pageComponent={GiftCertificatesPage} />;
}
