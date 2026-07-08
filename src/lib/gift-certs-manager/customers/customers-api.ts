import { getApiClient } from "@/lib/api-client/get-api-client";
import { V3ListResponse } from "@/lib/api-client/types";
import { CUSTOMERS_PATH, Customer, CustomersQuery, getCustomerPath } from "@/lib/gift-certs-manager/customers/types";

export interface CustomersResult {
  items: Customer[];
}

export interface CustomersListResult {
  items: Customer[];
  totalItems: number;
}

// BigCommerce's wire channel_ids is nullable; every other field on Customer
// already matches the wire response as-is, so this is the only normalization
// needed to match the Customer shape.
export interface CustomerWireRecord extends Omit<Customer, "channel_ids"> {
  channel_ids: number[] | null;
}

function parseCustomer(record: CustomerWireRecord): Customer {
  return { ...record, channel_ids: record.channel_ids ?? [] };
}

// Looks up registered customer accounts by email. Gift certificates (and any
// other feature that only knows an email address) use this to find out
// whether that email belongs to a registered customer, and if so, their
// account details — this data intentionally does not come back from the
// gift certificates endpoint itself.
export async function fetchCustomersByEmail(emails: string[]): Promise<CustomersResult> {
  const uniqueEmails = [...new Set(emails.filter((email) => email))];

  if (uniqueEmails.length === 0) {
    return { items: [] };
  }

  const apiClient = getApiClient();
  const response = await apiClient.get<V3ListResponse<CustomerWireRecord>>(CUSTOMERS_PATH, {
    params: {
      "email:in": uniqueEmails.join(","),
    },
  });

  return { items: response.data.map(parseCustomer) };
}

// BigCommerce v3 customers endpoint uses suffix-operator filters (:like/:in)
// and a single sort value with the direction embedded (e.g. "last_name:asc")
// — this app only ever sorts by last_name, the sole sortable column exposed
// in the UI.
export async function fetchCustomers(query: CustomersQuery): Promise<CustomersListResult> {
  const apiClient = getApiClient();

  const response = await apiClient.get<V3ListResponse<CustomerWireRecord>>(CUSTOMERS_PATH, {
    params: {
      "name:like": query.name,
      "email:in": query.email,
      "origin_channel_id:in": query.origin_channel_id.join(","),
      "date_created:min": query.date_created_min,
      "date_created:max": query.date_created_max,
      sort: `last_name:${query.direction.toLowerCase()}`,
      page: query.page,
      limit: query.limit,
    },
  });

  return { items: response.data.map(parseCustomer), totalItems: response.meta.pagination.total };
}

export async function fetchCustomer(id: number | string): Promise<Customer> {
  const apiClient = getApiClient();
  const response = await apiClient.get<{ data: CustomerWireRecord }>(getCustomerPath(id));

  return parseCustomer(response.data);
}
