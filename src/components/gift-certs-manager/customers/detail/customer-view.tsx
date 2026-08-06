import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { cacheProfile, CACHE_PROFILE_STANDARD } from "@/lib/cache/cache-profiles";
import { Box, Flex } from "@bigcommerce/big-design";
import { ArrowBackIcon } from "@bigcommerce/big-design-icons";
import { AppLink } from "@/components/ui/app-link";
import { CustomerInfoPanel } from "@/components/gift-certs-manager/customers/detail/customer-info-panel";
import { customerTag } from "@/lib/gift-certs-manager/customers/cache-tags";
import { decorateCustomerWithChannels } from "@/lib/gift-certs-manager/customers/decorate-with-channels";
import { fetchCustomer } from "@/lib/gift-certs-manager/customers/customers-api";
import { getAppUrl } from "@/lib/routing/app-url";

// Tagged with this customer's own detail tag, so a store credit mutation
// invalidates it instantly.
// TODO: Implement searchParams in props
export async function CustomerView({
  id,
  storeHash,
}: {
  id: string;
  storeHash: string | undefined;
}) {
  "use cache: remote";
  cacheLife(cacheProfile(CACHE_PROFILE_STANDARD));
  cacheTag(customerTag(id));
  // TODO: Add the gift certificates list cache tag  

  const rawCustomer = await fetchCustomer(id, storeHash);

  // A missing customer isn't a 404 from BigCommerce itself (see
  // fetchCustomer) — this is the one place that decides a missing record
  // means "render the not-found boundary." notFound() is safe to call from
  // inside a "use cache: remote" boundary; its digest survives the cache
  // wrapper's error handler unmodified.
  if (!rawCustomer) {
    notFound();
  }

  // TODO: embed this customer's own gift certificates below CustomerInfoPanel
  //  - fetchGiftCertificates scoped to { to_email: rawCustomer.email } (an
  //    empty searchParams query, since this filter is implied by the route,
  //    not user-chosen) - cacheTag(giftCertificateTag(item.id)) for each
  //    result once known
  //  - every row's recipient is this customer, so decorate each item with
  //    recipientAccount: customer directly, instead of a real
  //    decorateGiftCertificatesWithRecipientAccounts lookup

  const customer = await decorateCustomerWithChannels(rawCustomer, storeHash);

  return (
    <Box>
      <Box marginBottom="medium">
        <AppLink href={getAppUrl(storeHash, "/customers")}>
          <Flex alignItems="center" flexGap="0.25rem">
            <ArrowBackIcon size="small" />
            Back to Customers
          </Flex>
        </AppLink>
      </Box>

      <CustomerInfoPanel customer={customer} />

      {/* TODO: Render a panel with GiftCertificateTable */}
    </Box>
  );
}
