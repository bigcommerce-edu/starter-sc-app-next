import { Box } from "@/components/ui/box";
import { Panel } from "@/components/ui/panel";
import { Small, Text } from "@/components/ui/text";
import { ControlPanelLink } from "@/components/ui/control-panel-link";
import { CustomerWithChannels, sumStoreCredit } from "@/lib/gift-certs-manager/customers/types";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box marginBottom="medium">
      <Small marginBottom="none">{label}</Small>
      <Text marginBottom="none">{children}</Text>
    </Box>
  );
}

export function CustomerInfoPanel({
  customer,
  storeHash,
}: {
  customer: CustomerWithChannels;
  storeHash: string | undefined;
}) {
  const associatedChannelNames = customer.channels.map((channel) => channel.name).join(", ");

  return (
    <Panel header={`${customer.first_name} ${customer.last_name}`}>
      <Box marginBottom="medium">
        <ControlPanelLink path={`/manage/customers/${customer.id}/edit`} storeHash={storeHash}>
          BigCommerce Customer View
        </ControlPanelLink>
      </Box>

      <DetailField label="Email">{customer.email}</DetailField>
      <DetailField label="Origin Channel">{customer.originChannel?.name ?? customer.origin_channel_id}</DetailField>
      <DetailField label="Associated Channels">{associatedChannelNames || "None"}</DetailField>
      <DetailField label="Store Credit Balance">
        {currencyFormatter.format(sumStoreCredit(customer.store_credit_amounts))}
      </DetailField>
    </Panel>
  );
}
