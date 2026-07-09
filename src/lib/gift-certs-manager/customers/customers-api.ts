import { getApiClient } from "@/lib/api-client/get-api-client";
import { StoreCredentials } from "@/lib/api-client/store-credentials";
import { V3ListResponse } from "@/lib/api-client/types";
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

// Looks up registered customer accounts by email. Gift certificates (and any
// other feature that only knows an email address) use this to find out
// whether that email belongs to a registered customer, and if so, their
// account details — this data intentionally does not come back from the
// gift certificates endpoint itself.
export async function fetchCustomersByEmail(
  emails: string[],
  apiCredentials: StoreCredentials,
): Promise<CustomersResult> {
  const uniqueEmails = [...new Set(emails.filter((email) => email))];

  if (uniqueEmails.length === 0) {
    return { items: [] };
  }

  const apiClient = getApiClient(apiCredentials);
  const { data: body } = await apiClient.get<V3ListResponse<CustomerWireRecord>>(CUSTOMERS_PATH, {
    params: {
      "email:in": uniqueEmails.join(","),
      include: "storecredit",
    },
  });

  return { items: body.data.map(parseCustomer) };
}

// BigCommerce v3 customers endpoint uses suffix-operator filters (:like/:in)
// and a single sort value with the direction embedded (e.g. "last_name:asc")
// — this app only ever sorts by last_name, the sole sortable column exposed
// in the UI.
export async function fetchCustomers(
  query: CustomersQuery,
  apiCredentials: StoreCredentials,
): Promise<CustomersListResult> {
  const apiClient = getApiClient(apiCredentials);

  const { data: body } = await apiClient.get<V3ListResponse<CustomerWireRecord>>(CUSTOMERS_PATH, {
    params: {
      "name:like": query.name,
      "email:in": query.email,
      "date_created:min": query.date_created_min,
      "date_created:max": query.date_created_max,
      sort: `last_name:${query.direction.toLowerCase()}`,
      page: query.page,
      limit: query.limit,
      include: "storecredit",
    },
  });

  return { items: body.data.map(parseCustomer), totalItems: body.meta.pagination.total };
}

// BigCommerce's v3 customers endpoint has no single-resource path (unlike
// gift certificates/channels) — GET /v3/customers?id:in={id} is the
// documented way to fetch one customer by id.
export async function fetchCustomer(id: number | string, apiCredentials: StoreCredentials): Promise<Customer> {
  const apiClient = getApiClient(apiCredentials);
  const { data: body } = await apiClient.get<V3ListResponse<CustomerWireRecord>>(CUSTOMERS_PATH, {
    params: { "id:in": id, include: "storecredit" },
  });

  const record = body.data[0];

  if (!record) {
    throw new Error(`No customer found with id "${id}".`);
  }

  return parseCustomer(record);
}
