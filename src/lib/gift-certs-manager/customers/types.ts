import { Channel } from "@/lib/gift-certs-manager/channels/types";

// Matches BigDesign's own TableSortDirection type (re-declared here so this
// file has no dependency on BigDesign — see CustomersQuery below for why the
// UI layer's Table component ultimately needs this exact shape).
export type SortDirection = "ASC" | "DESC";

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
// a single-currency store. date_created is left as the raw ISO 8601 string
// the API returns — components format it for display at render time.
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
  date_created: string;
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

// BigCommerce's v3 customers endpoint supports name:like, email:in,
// origin_channel_id:in, and date_created:min/date_created:max filters, plus
// sorting — this app only ever sorts by last_name (the sole sortable column
// exposed in the UI), so there's no separate sort-column field to track.
// Field names match the request params fetchCustomers sends directly
// (with ":min"/":max" replaced by "_min"/"_max", since those aren't valid
// identifier characters), so there's no separate translation step beyond
// that between this and the wire request.
export interface CustomersQuery {
  name: string;
  email: string;
  origin_channel_id: number[];
  date_created_min: string;
  date_created_max: string;
  direction: SortDirection;
  page: number;
  limit: number;
}
