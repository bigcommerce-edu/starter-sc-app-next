// Per-id tag for detail fetches (so one certificate's mutation doesn't
// invalidate another's cache), plus one shared tag for list fetches.
export function giftCertificateTag(id: number | string): string {
  return `gift-cert:${id}`;
}

export const GIFT_CERTIFICATES_LIST_TAG = "gift-cert:list";
