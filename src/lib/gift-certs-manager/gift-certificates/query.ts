import { SortDirection } from "@/lib/gift-certs-manager/customers/types";
import { GiftCertificatesQuery } from "@/lib/gift-certs-manager/gift-certificates/types";

export const DEFAULT_QUERY: GiftCertificatesQuery = {
  // TODO: Add code, to_name, to_email filters
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
  // TODO: Parse code, to_name, to_email filters

  // BigCommerce only documents sort=id for this endpoint, so the only choice
  // left to the user is direction (newest/oldest by id).
  const directionParam = getParam(searchParams, "direction");
  const direction: SortDirection = directionParam === "ASC" ? "ASC" : DEFAULT_QUERY.direction;

  const pageParam = Number(getParam(searchParams, "page"));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : DEFAULT_QUERY.page;

  const limitParam = Number(getParam(searchParams, "limit"));
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : DEFAULT_QUERY.limit;

  // TODO: Return the parsed filters
  return { direction, page, limit };
}

export function buildGiftCertificatesSearchParams(query: GiftCertificatesQuery): URLSearchParams {
  const params = new URLSearchParams();

  // TODO: Add code, to_name, to_email filters

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
