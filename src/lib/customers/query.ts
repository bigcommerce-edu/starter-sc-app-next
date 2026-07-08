import { TableSortDirection } from "@/components/ui/big-design";
import { CustomersQuery } from "@/lib/customers/types";

export const DEFAULT_QUERY: CustomersQuery = {
  name: "",
  email: "",
  originChannelIds: [],
  sortColumnHash: "name",
  sortDirection: "ASC",
  currentPage: 1,
  itemsPerPage: 10,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: RawSearchParams, key: string): string | undefined {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

export function parseCustomersQuery(searchParams: RawSearchParams): CustomersQuery {
  const name = getParam(searchParams, "name") ?? DEFAULT_QUERY.name;
  const email = getParam(searchParams, "email") ?? DEFAULT_QUERY.email;

  const originChannelIdsParam = getParam(searchParams, "originChannelIds");
  const originChannelIds = originChannelIdsParam
    ? originChannelIdsParam
        .split(",")
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value))
    : DEFAULT_QUERY.originChannelIds;

  const sortColumnHash = getParam(searchParams, "sort") ?? DEFAULT_QUERY.sortColumnHash;
  const sortDirectionParam = getParam(searchParams, "direction");
  const sortDirection: TableSortDirection = sortDirectionParam === "DESC" ? "DESC" : DEFAULT_QUERY.sortDirection;

  const currentPageParam = Number(getParam(searchParams, "page"));
  const currentPage = Number.isInteger(currentPageParam) && currentPageParam > 0 ? currentPageParam : DEFAULT_QUERY.currentPage;

  const itemsPerPageParam = Number(getParam(searchParams, "perPage"));
  const itemsPerPage = Number.isInteger(itemsPerPageParam) && itemsPerPageParam > 0 ? itemsPerPageParam : DEFAULT_QUERY.itemsPerPage;

  return {
    name,
    email,
    originChannelIds,
    sortColumnHash,
    sortDirection,
    currentPage,
    itemsPerPage,
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

  if (query.originChannelIds.length > 0) {
    params.set("originChannelIds", query.originChannelIds.join(","));
  }

  if (query.sortColumnHash !== DEFAULT_QUERY.sortColumnHash) {
    params.set("sort", query.sortColumnHash);
  }

  if (query.sortDirection !== DEFAULT_QUERY.sortDirection) {
    params.set("direction", query.sortDirection);
  }

  if (query.currentPage !== DEFAULT_QUERY.currentPage) {
    params.set("page", String(query.currentPage));
  }

  if (query.itemsPerPage !== DEFAULT_QUERY.itemsPerPage) {
    params.set("perPage", String(query.itemsPerPage));
  }

  return params;
}
