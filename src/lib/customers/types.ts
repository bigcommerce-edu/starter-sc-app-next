export const CUSTOMERS_PATH = "/v3/customers";

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
}

export interface CustomersResult {
  items: Customer[];
}
