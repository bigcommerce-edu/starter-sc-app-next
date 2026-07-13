import { cacheLife, cacheTag } from "next/cache";
import { ArrowBackIcon, Box, Flex, Link, Panel } from "@/components/ui/big-design";
import { CustomerInfoPanel } from "@/components/gift-certs-manager/customers/detail/customer-info-panel";
import { GiftCertificateTable } from "@/components/gift-certs-manager/gift-certificates/list/gift-certificate-table";
import { customerTag } from "@/lib/gift-certs-manager/customers/cache-tags";
import { decorateCustomerWithChannels } from "@/lib/gift-certs-manager/customers/decorate-with-channels";
import { fetchCustomer } from "@/lib/gift-certs-manager/customers/customers-api";
import { GIFT_CERTIFICATES_LIST_TAG } from "@/lib/gift-certs-manager/gift-certificates/cache-tags";
import { fetchGiftCertificates } from "@/lib/gift-certs-manager/gift-certificates/gift-certificates-api";
import { parseGiftCertificatesQuery } from "@/lib/gift-certs-manager/gift-certificates/query";
import { getAppUrl } from "@/lib/routing/app-url";

// Tagged with both this customer's own detail tag (so a store credit
// mutation invalidates it instantly) and the shared gift-certificates list
// tag (since this view also renders a filtered listing of this customer's
// certificates, the same granularity as any other listing page). `use cache`
// wraps the whole rendered view, so a cache hit skips re-rendering
// CustomerInfoPanel/GiftCertificateTable too. storeHash is the raw
// [storeHash] route param (or undefined on a root-level dev route) — a
// plain, serializable string, so it's safe to cross this cache boundary. It's
// used both for data-access calls (getRestApiClient resolves which store to
// actually target internally) and for building URLs further down.
export async function CustomerView({
  id,
  searchParams,
  storeHash,
}: {
  id: string;
  searchParams: Record<string, string | string[] | undefined>;
  storeHash: string | undefined;
}) {
  "use cache: remote";
  cacheLife("standard");
  cacheTag(customerTag(id));
  cacheTag(GIFT_CERTIFICATES_LIST_TAG);

  const rawCustomer = await fetchCustomer(id, storeHash);

  // to_email scopes the fetch to this customer's certificates, but it's
  // implied by the route (not a user-chosen filter) and must never be echoed
  // into the URL, so it's kept out of the query passed down to the table.
  const query = parseGiftCertificatesQuery(searchParams);

  // Channel decoration and the gift-certificates fetch are independent once
  // rawCustomer.email is known, so they run concurrently rather than one
  // blocking the other.
  const [customer, { items, hasNextPage }] = await Promise.all([
    decorateCustomerWithChannels(rawCustomer, storeHash),
    fetchGiftCertificates({ ...query, to_email: rawCustomer.email }, storeHash),
  ]);

  // Every row's recipient is this customer, so there's no need to decorate
  // via a separate customer lookup — the account is already known.
  const decoratedItems = items.map((certificate) => ({ ...certificate, recipientAccount: customer }));

  return (
    <Box>
      <Box marginBottom="medium">
        <Link href={getAppUrl(storeHash, "/customers")}>
          <Flex alignItems="center" flexGap="0.25rem">
            <ArrowBackIcon size="small" />
            Back to Customers
          </Flex>
        </Link>
      </Box>

      <Box marginBottom="medium">
        <CustomerInfoPanel customer={customer} />
      </Box>

      <Panel header="Gift Certificates">
        <GiftCertificateTable
          giftCertificates={decoratedItems}
          hasNextPage={hasNextPage}
          query={query}
          showFilters={false}
          showRecipientColumns={false}
          storeHash={storeHash}
        />
      </Panel>
    </Box>
  );
}
