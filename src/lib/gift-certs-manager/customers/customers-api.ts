import { getDataMode } from "@/lib/bc-api-client/data-mode";
import { handleCustomersListRequest } from "@/lib/gift-certs-manager/customers/mock/customers-list-handler";
import { CUSTOMERS_PATH, Customer, CustomersQuery } from "@/lib/gift-certs-manager/customers/types";

export interface CustomersResult {
  items: Customer[];
}

export interface CustomersListResult {
  items: Customer[];
  totalItems: number;
}

// BigCommerce's wire channel_ids is nullable; store_credit_amounts is only
// present at all when the request passes include=storecredit (every fetch
// below does). Every other field on Customer already matches the wire
// response as-is, so these are the only normalizations needed to match the
// Customer shape.
export interface CustomerWireRecord extends Omit<Customer, "channel_ids" | "store_credit_amounts"> {
  channel_ids: number[] | null;
  store_credit_amounts?: Array<{ amount: string }>;
}

function parseCustomer(record: CustomerWireRecord): Customer {
  return { ...record, channel_ids: record.channel_ids ?? [], store_credit_amounts: record.store_credit_amounts ?? [] };
}

// Looks up registered customer accounts by email — this data isn't returned
// by the gift certificates endpoint itself. Caching lives in the calling
// *View component, not here. Only MOCK mode is implemented so far — it
// calls the mock handler directly, the same data a real endpoint would
// return.
export async function fetchCustomersByEmail(
  emails: string[],
  storeHash: string | undefined,
): Promise<CustomersResult> {
  const uniqueEmails = [...new Set(emails.filter((email) => email))];

  if (uniqueEmails.length === 0) {
    return { items: [] };
  }

  if (getDataMode() !== "MOCK") {
    throw new Error("Not implemented yet.");
  }

  const { data } = handleCustomersListRequest({
    "email:in": uniqueEmails.join(","),
    include: "storecredit",
  });

  return { items: data.map(parseCustomer) };
}

// BigCommerce's v3 customers endpoint has no "name" field to sort on — this
// is the one place that translates the UI's Name column to a real field. It
// sorts on first_name, matching how the Name column actually renders
// ("{first_name} {last_name}"), so the order the user sees agrees with the
// column they clicked. The endpoint also accepts last_name and date_created.
const SORT_FIELD: Record<CustomersQuery["sortColumn"], string> = {
  name: "first_name",
  date_created: "date_created",
};

// query.date_created_max is a bare yyyy-MM-dd date (see customer-filters.tsx),
// but BigCommerce's v3 endpoint compares date_created:max against a full
// timestamp — sent as-is, it'd be read as that day's midnight and exclude
// every customer created later that same day. Appending the end of day
// keeps it inclusive of the whole selected day, matching the mock's
// date-only comparison (see customers-list-handler.ts) so MOCK and
// MULTITENANT agree on what "before this day" means. date_created:min needs
// no such adjustment — midnight is already the inclusive start of that day.
function toEndOfDayTimestamp(date: string): string {
  return `${date}T23:59:59Z`;
}

// BigCommerce's v3 endpoint uses suffix-operator filters (:like/:in) and a
// single sort value with direction embedded (e.g. "last_name:asc"). Only
// MOCK mode is implemented so far.
export async function fetchCustomers(
  query: CustomersQuery,
  storeHash: string | undefined,
): Promise<CustomersListResult> {
  if (getDataMode() !== "MOCK") {
    throw new Error("Not implemented yet.");
  }

  const { data, meta } = handleCustomersListRequest({
    ... (query.name && { "name:like": query.name }),
    ... (query.email && { "email:in": query.email }),
    ... (query.date_created_min && { "date_created:min": query.date_created_min }),
    ... (query.date_created_max && { "date_created:max": toEndOfDayTimestamp(query.date_created_max) }),
    sort: `${SORT_FIELD[query.sortColumn]}:${query.direction.toLowerCase()}`,
    page: query.page,
    limit: query.limit,
    include: "storecredit",
  });

  return { items: data.map(parseCustomer), totalItems: meta.pagination.total };
}

// No single-resource path in BigCommerce's v3 API — GET
// /v3/customers?id:in={id} is the documented way to fetch one by id. A
// missing id is a list filtered to zero rows, not a 404, so this returns
// undefined rather than deciding what "not found" means — see CustomerView
// for the notFound() translation. Only MOCK mode is implemented so far.
export async function fetchCustomer(id: number | string, storeHash: string | undefined): Promise<Customer | undefined> {
  if (getDataMode() !== "MOCK") {
    throw new Error("Not implemented yet.");
  }

  const { data } = handleCustomersListRequest({ "id:in": id, include: "storecredit" });
  const record = data[0];

  return record ? parseCustomer(record) : undefined;
}

// Not implemented yet — built out in the gift-certs-enh enhancement.
export function addToCustomerStoreCredit(): void {}
