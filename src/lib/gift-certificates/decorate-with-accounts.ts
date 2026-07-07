import { fetchCustomersByEmail } from "@/lib/customers/customers-api";
import { Customer } from "@/lib/customers/types";
import { GiftCertificate, GiftCertificateWithAccounts, GiftCertificateWithRecipientAccount } from "@/lib/gift-certificates/types";

function findAccountByEmail(customers: Customer[], email: string): Customer | undefined {
  return customers.find((customer) => customer.email.toLowerCase() === email.toLowerCase());
}

// The listing page only ever renders recipient account info, so it only
// looks up (and only pays the request cost for) recipient emails.
export async function decorateGiftCertificatesWithRecipientAccounts(
  giftCertificates: GiftCertificate[],
): Promise<GiftCertificateWithRecipientAccount[]> {
  const emails = giftCertificates.map((certificate) => certificate.recipientEmail);
  const { items: customers } = await fetchCustomersByEmail(emails);

  return giftCertificates.map((certificate) => ({
    ...certificate,
    recipientAccount: findAccountByEmail(customers, certificate.recipientEmail),
  }));
}

// The detail page renders both sender and recipient account info, so it
// looks up both emails in a single batched request.
export async function decorateGiftCertificateWithAccounts(
  giftCertificate: GiftCertificate,
): Promise<GiftCertificateWithAccounts> {
  const { items: customers } = await fetchCustomersByEmail([
    giftCertificate.senderEmail,
    giftCertificate.recipientEmail,
  ]);

  return {
    ...giftCertificate,
    senderAccount: findAccountByEmail(customers, giftCertificate.senderEmail),
    recipientAccount: findAccountByEmail(customers, giftCertificate.recipientEmail),
  };
}
