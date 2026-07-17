// Tag naming for `use cache` on customer fetches. Mirrors the gift
// certificates cache-tags module: a per-id tag for the detail fetch so a
// mutation to one customer's store credit never invalidates any other
// customer's cached detail fetch, and a single shared tag for list/collection
// fetches, which are left to expire on the standard cacheLife instead.
export function customerTag(id: number | string): string {
  return `customer:${id}`;
}

export const CUSTOMERS_LIST_TAG = "customer:list";
