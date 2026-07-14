import { fetchChannels } from "@/lib/gift-certs-manager/channels/channels-api";
import { Channel } from "@/lib/gift-certs-manager/channels/types";
import { Customer, CustomerWithChannels } from "@/lib/gift-certs-manager/customers/types";

function findChannelById(channels: Channel[], id: number): Channel | undefined {
  return channels.find((channel) => channel.id === id);
}

// Attaches channel names to a customer's origin_channel_id/channel_ids.
// Customers only ever know channels by id — this is the one place that
// looks up what those ids actually refer to. Callers that already have the
// full channel list on hand (e.g. because they also need it to populate a
// filter) can pass it in directly to avoid fetching it twice.
export async function decorateCustomersWithChannels(
  customers: Customer[],
  channels?: Channel[],
): Promise<CustomerWithChannels[]> {
  const resolvedChannels = channels ?? (await fetchChannels()).items;

  return customers.map((customer) => ({
    ...customer,
    originChannel: findChannelById(resolvedChannels, customer.origin_channel_id),
    channels: customer.channel_ids
      .map((channelId) => findChannelById(resolvedChannels, channelId))
      .filter((channel): channel is Channel => channel !== undefined),
  }));
}

export async function decorateCustomerWithChannels(customer: Customer, channels?: Channel[]): Promise<CustomerWithChannels> {
  const [decorated] = await decorateCustomersWithChannels([customer], channels);

  return decorated;
}
