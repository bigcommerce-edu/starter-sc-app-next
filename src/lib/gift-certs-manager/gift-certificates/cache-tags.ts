// Tag naming for `use cache` on gift certificate fetches. The detail tag is
// per-id so a mutation to one certificate never invalidates any other
// certificate's cached detail fetch; the list tag is a single shared tag
// since list/collection fetches (the listing page, and the certificates
// table embedded in a customer's detail page) are cheap to just let expire
// on the standard cacheLife rather than track individually.
export function giftCertificateTag(id: number | string): string {
  return `gift-cert:${id}`;
}

export const GIFT_CERTIFICATES_LIST_TAG = "gift-cert:list";
