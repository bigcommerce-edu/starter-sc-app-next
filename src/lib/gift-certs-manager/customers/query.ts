import { TableSortDirection } from "@/components/ui/big-design";
import { CustomersQuery } from "@/lib/gift-certs-manager/customers/types";

export const DEFAULT_QUERY: CustomersQuery = {
  name: "",
  email: "",
  origin_channel_id: [],
  date_created_min: "",
  date_created_max: "",
  direction: "ASC",
  page: 1,
  limit: 10,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: RawSearchParams, key: string): string | undefined {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

export function parseCustomersQuery(searchParams: RawSearchParams): CustomersQuery {
  const name = getParam(searchParams, "name") ?? DEFAULT_QUERY.name;
  const email = getParam(searchParams, "email") ?? DEFAULT_QUERY.email;

  const originChannelIdParam = getParam(searchParams, "origin_channel_id");
  const origin_channel_id = originChannelIdParam
    ? originChannelIdParam
        .split(",")
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value))
    : DEFAULT_QUERY.origin_channel_id;

  const date_created_min = getParam(searchParams, "date_created_min") ?? DEFAULT_QUERY.date_created_min;
  const date_created_max = getParam(searchParams, "date_created_max") ?? DEFAULT_QUERY.date_created_max;

  // name is the only sortable column BigCommerce supports for customers
  // (mapped to last_name server-side — see customers-api.ts), so the only
  // choice left to the user is direction.
  const directionParam = getParam(searchParams, "direction");
  const direction: TableSortDirection = directionParam === "DESC" ? "DESC" : DEFAULT_QUERY.direction;

  const pageParam = Number(getParam(searchParams, "page"));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : DEFAULT_QUERY.page;

  const limitParam = Number(getParam(searchParams, "limit"));
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : DEFAULT_QUERY.limit;

  return {
    name,
    email,
    origin_channel_id,
    date_created_min,
    date_created_max,
    direction,
    page,
    limit,
  };
}

export function buildCustomersSearchParams(query: CustomersQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.name) {
    params.set("name", query.name);
  }

  if (query.email) {
    params.set("email", query.email);
  }

  if (query.origin_channel_id.length > 0) {
    params.set("origin_channel_id", query.origin_channel_id.join(","));
  }

  if (query.date_created_min) {
    params.set("date_created_min", query.date_created_min);
  }

  if (query.date_created_max) {
    params.set("date_created_max", query.date_created_max);
  }

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
