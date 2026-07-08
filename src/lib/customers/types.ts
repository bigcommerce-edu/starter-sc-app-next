import { TableSortDirection } from "@/components/ui/big-design";
import { Channel } from "@/lib/channels/types";

export const CUSTOMERS_PATH = "/v3/customers";

export function getCustomerPath(id: number | string): string {
  return `${CUSTOMERS_PATH}/${id}`;
}

// Mirrors the subset of the BigCommerce v3 customers resource this app needs.
export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  // The channel the customer's account was originally created on, and every
  // channel they're currently registered on (origin_channel_id/channel_ids
  // on the wire). See lib/channels for what a channel id refers to.
  originChannelId: number;
  channelIds: number[];
  storeCreditBalance: number;
}

export interface CustomersResult {
  items: Customer[];
}

// A Customer decorated with the Channel objects its originChannelId/
// channelIds refer to. originChannel is undefined only if the id doesn't
// match any known channel, which shouldn't happen with real data.
export interface CustomerWithChannels extends Customer {
  originChannel: Channel | undefined;
  channels: Channel[];
}

export interface CustomersQuery {
  name: string;
  email: string;
  originChannelIds: number[];
  sortColumnHash: string;
  sortDirection: TableSortDirection;
  currentPage: number;
  itemsPerPage: number;
}

export interface CustomersListResult {
  items: Customer[];
  totalItems: number;
}
