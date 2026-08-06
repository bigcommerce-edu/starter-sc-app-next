import { GiftCertificatesQuery, SortDirection } from "@/lib/gift-certs-manager/gift-certificates/types";

export const DEFAULT_QUERY: GiftCertificatesQuery = {
  direction: "DESC",
  page: 1,
  limit: 10,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: RawSearchParams, key: string): string | undefined {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

export function parseGiftCertificatesQuery(searchParams: RawSearchParams): GiftCertificatesQuery {
  // BigCommerce only documents sort=id for this endpoint, so the only choice
  // left to the user is direction (newest/oldest by id).
  const directionParam = getParam(searchParams, "direction");
  const direction: SortDirection = directionParam === "ASC" ? "ASC" : DEFAULT_QUERY.direction;

  const pageParam = Number(getParam(searchParams, "page"));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : DEFAULT_QUERY.page;

  const limitParam = Number(getParam(searchParams, "limit"));
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : DEFAULT_QUERY.limit;

  return { direction, page, limit };
}

export function buildGiftCertificatesSearchParams(query: GiftCertificatesQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.direction !== DEFAULT_QUERY.direction) {
    params.set("direction", query.direction);
  }

  if (query.page !== DEFAULT_QUERY.page) {
    params.set("page", String(query.page));
  }

  if (query.limit !== DEFAULT_QUERY.limit) {
    params.set("limit", String(query.limit));
  }

  return params;
}
