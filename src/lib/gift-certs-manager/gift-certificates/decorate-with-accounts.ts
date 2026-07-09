import { fetchCustomersByEmail } from "@/lib/gift-certs-manager/customers/customers-api";
import { Customer } from "@/lib/gift-certs-manager/customers/types";
import { GiftCertificate, GiftCertificateWithAccounts, GiftCertificateWithRecipientAccount } from "@/lib/gift-certs-manager/gift-certificates/types";

function findAccountByEmail(customers: Customer[], email: string): Customer | undefined {
  return customers.find((customer) => customer.email.toLowerCase() === email.toLowerCase());
}

// The listing page only ever renders recipient account info, so it only
// looks up (and only pays the request cost for) recipient emails.
export async function decorateGiftCertificatesWithRecipientAccounts(
  giftCertificates: GiftCertificate[],
): Promise<GiftCertificateWithRecipientAccount[]> {
  const emails = giftCertificates.map((certificate) => certificate.to_email);
  const { items: customers } = await fetchCustomersByEmail(emails);

  return giftCertificates.map((certificate) => ({
    ...certificate,
    recipientAccount: findAccountByEmail(customers, certificate.to_email),
  }));
}

// The detail page renders both sender and recipient account info, so it
// looks up both emails in a single batched request.
export async function decorateGiftCertificateWithAccounts(
  giftCertificate: GiftCertificate,
): Promise<GiftCertificateWithAccounts> {
  const { items: customers } = await fetchCustomersByEmail([giftCertificate.from_email, giftCertificate.to_email]);

  return {
    ...giftCertificate,
    senderAccount: findAccountByEmail(customers, giftCertificate.from_email),
    recipientAccount: findAccountByEmail(customers, giftCertificate.to_email),
  };
}
