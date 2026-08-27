// Per-id tag for detail fetches (so one customer's mutation doesn't
// invalidate another's cache), plus one shared tag for list fetches.
export function customerTag(id: number | string): string {
  return `customer:${id}`;
}

export const CUSTOMERS_LIST_TAG = "customer:list";
