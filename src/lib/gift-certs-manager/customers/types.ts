import { Channel } from "@/lib/gift-certs-manager/channels/types";

// Matches BigDesign's TableSortDirection type (re-declared here so this file
// has no dependency on BigDesign).
export type SortDirection = "ASC" | "DESC";

// BigCommerce's v3 customers endpoint has no single-resource path — even a
// single lookup goes through this path with filters (e.g. id:in) rather than
// a /{id} suffix.
export const CUSTOMERS_PATH = "/v3/customers";

// Matches the BigCommerce v3 customer resource's field names directly.
// channel_ids is normalized from the wire's nullable array to always be an
// array (see customers-api.ts). store_credit_amounts stays the raw
// per-currency array; sumStoreCredit() below collapses it to a single number
// at render time (this demo assumes a single-currency store).
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
// channel_ids refer to.
export interface CustomerWithChannels extends Customer {
  originChannel: Channel | undefined;
  channels: Channel[];
}

// The two sortable columns in the UI (Name, Customer Since). BigCommerce's
// v3 endpoint also supports date_modified, which this app doesn't expose.
export type CustomersSortColumn = "name" | "date_created";

// No origin-channel filter: BigCommerce's v3 customers endpoint doesn't
// support filtering by origin_channel_id, so the "Origin Channel" column
// (decorateCustomersWithChannels) is display-only. Field names otherwise
// match the request params fetchCustomers sends directly (":min"/":max"
// become "_min"/"_max", since those aren't valid identifier characters).
export interface CustomersQuery {
  name: string;
  email: string;
  date_created_min: string;
  date_created_max: string;
  sortColumn: CustomersSortColumn;
  direction: SortDirection;
  page: number;
  limit: number;
}
