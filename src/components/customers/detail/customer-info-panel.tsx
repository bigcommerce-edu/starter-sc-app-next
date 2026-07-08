import { Box, Panel, Small, Text } from "@/components/ui/big-design";
import { CustomerWithChannels } from "@/lib/customers/types";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box marginBottom="medium">
      <Small marginBottom="none">{label}</Small>
      <Text marginBottom="none">{children}</Text>
    </Box>
  );
}

export function CustomerInfoPanel({ customer }: { customer: CustomerWithChannels }) {
  const associatedChannelNames = customer.channels.map((channel) => channel.name).join(", ");

  return (
    <Panel header={`${customer.firstName} ${customer.lastName}`}>
      <DetailField label="Email">{customer.email}</DetailField>
      <DetailField label="Origin Channel">{customer.originChannel?.name ?? customer.originChannelId}</DetailField>
      <DetailField label="Associated Channels">{associatedChannelNames || "None"}</DetailField>
      <DetailField label="Store Credit Balance">{currencyFormatter.format(customer.storeCreditBalance)}</DetailField>
    </Panel>
  );
}
