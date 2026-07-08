import { CustomerWireRecord } from "@/lib/customers/customers-api";

// Registered customer accounts for the emails that mock-gift-certificates.ts
// marks as belonging to a registered customer. Account names occasionally
// differ from the name entered on the certificate (e.g. a middle initial) to
// demonstrate that the two are independent. store_credit_amounts models the
// real per-currency array shape even though every mock store is USD-only.
function withStoreCredit(amount: number): Array<{ amount: string }> {
  return amount > 0 ? [{ amount: amount.toFixed(2) }] : [];
}

export const mockCustomers: CustomerWireRecord[] = [
  { id: 1, first_name: "Noah", last_name: "Thompson", email: "noah.thompson@example.com", origin_channel_id: 1, channel_ids: [1], store_credit_amounts: withStoreCredit(0) },
  { id: 2, first_name: "Liam", last_name: "Carter", email: "liam.carter@example.com", origin_channel_id: 1, channel_ids: [1, 2], store_credit_amounts: withStoreCredit(25) },
  { id: 3, first_name: "Mason", last_name: "Bennett", email: "mason.bennett@example.com", origin_channel_id: 2, channel_ids: [2], store_credit_amounts: withStoreCredit(0) },
  { id: 4, first_name: "Olivia B.", last_name: "Bennett", email: "olivia.bennett@example.com", origin_channel_id: 1, channel_ids: [1], store_credit_amounts: withStoreCredit(15.5) },
  { id: 5, first_name: "Lucas", last_name: "Nguyen", email: "lucas.nguyen@example.com", origin_channel_id: 1, channel_ids: [1, 3], store_credit_amounts: withStoreCredit(0) },
  { id: 6, first_name: "William", last_name: "Foster", email: "william.foster@example.com", origin_channel_id: 3, channel_ids: [3], store_credit_amounts: withStoreCredit(50) },
  { id: 7, first_name: "Daniel", last_name: "Martinez", email: "daniel.martinez@example.com", origin_channel_id: 1, channel_ids: [1], store_credit_amounts: withStoreCredit(0) },
  { id: 8, first_name: "Sophia", last_name: "Martinez", email: "sophia.martinez@example.com", origin_channel_id: 2, channel_ids: [1, 2], store_credit_amounts: withStoreCredit(10) },
  { id: 9, first_name: "Henry", last_name: "Cruz", email: "henry.cruz@example.com", origin_channel_id: 1, channel_ids: [1], store_credit_amounts: withStoreCredit(0) },
  { id: 10, first_name: "Isabella", last_name: "Cruz", email: "isabella.cruz@example.com", origin_channel_id: 1, channel_ids: [1], store_credit_amounts: withStoreCredit(5.25) },
  { id: 11, first_name: "Jack", last_name: "Sullivan", email: "jack.sullivan@example.com", origin_channel_id: 3, channel_ids: [2, 3], store_credit_amounts: withStoreCredit(0) },
  { id: 12, first_name: "Mia R.", last_name: "Sullivan", email: "mia.sullivan@example.com", origin_channel_id: 1, channel_ids: [1], store_credit_amounts: withStoreCredit(30) },
];
