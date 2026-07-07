export const CUSTOMERS_PATH = "/v3/customers";

// Mirrors the subset of the BigCommerce v3 customers resource this app needs.
export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CustomersResult {
  items: Customer[];
}
