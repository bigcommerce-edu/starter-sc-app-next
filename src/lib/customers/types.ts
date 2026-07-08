import { TableSortDirection } from "@/components/ui/big-design";
import { Channel } from "@/lib/channels/types";

export const CUSTOMERS_PATH = "/v3/customers";

export function getCustomerPath(id: number | string): string {
  return `${CUSTOMERS_PATH}/${id}`;
}

// Matches the BigCommerce v3 customer resource exactly (see
// https://docs.bigcommerce.com/docs/rest-management/customers) — same field
// names as the wire response, so there's no separate "API" vs. "app" shape
// to keep in sync. channel_ids is normalized from the wire's nullable array
// to always be an array (see customers-api.ts). store_credit_amounts is left
// as the raw per-currency array the API returns — sumStoreCredit() below
// collapses it into a single number at render time, since this demo assumes
// a single-currency store.
export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  // The channel the account was originally created on, and every channel
  // it's currently registered on.
  origin_channel_id: number;
  channel_ids: number[];
  store_credit_amounts: Array<{ amount: string }>;
}

export function sumStoreCredit(amounts: Array<{ amount: string }>): number {
  return amounts.reduce((total, entry) => total + Number(entry.amount), 0);
}

// A Customer decorated with the Channel objects its origin_channel_id/
// channel_ids refer to. originChannel is undefined only if the id doesn't
// match any known channel, which shouldn't happen with real data.
export interface CustomerWithChannels extends Customer {
  originChannel: Channel | undefined;
  channels: Channel[];
}

// BigCommerce's v3 customers endpoint supports name:like, email:in, and
// origin_channel_id:in filters, plus sorting — this app only ever sorts by
// last_name (the sole sortable column exposed in the UI), so there's no
// separate sort-column field to track. Field names match the request params
// fetchCustomers sends directly, so there's no separate translation step
// between this and the wire request.
export interface CustomersQuery {
  name: string;
  email: string;
  origin_channel_id: number[];
  direction: TableSortDirection;
  page: number;
  limit: number;
}
