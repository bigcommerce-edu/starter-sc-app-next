import { TableSortDirection } from "@/components/ui/big-design";
import { GiftCertificatesQuery } from "@/lib/gift-certificates/types";

export const DEFAULT_QUERY: GiftCertificatesQuery = {
  searchTerm: "",
  sortColumnHash: "purchaseDate",
  sortDirection: "DESC",
  currentPage: 1,
  itemsPerPage: 10,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function getParam(searchParams: RawSearchParams, key: string): string | undefined {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

export function parseGiftCertificatesQuery(searchParams: RawSearchParams): GiftCertificatesQuery {
  const searchTerm = getParam(searchParams, "q") ?? DEFAULT_QUERY.searchTerm;
  const sortColumnHash = getParam(searchParams, "sort") ?? DEFAULT_QUERY.sortColumnHash;
  const sortDirectionParam = getParam(searchParams, "direction");
  const sortDirection: TableSortDirection = sortDirectionParam === "ASC" ? "ASC" : DEFAULT_QUERY.sortDirection;

  const currentPageParam = Number(getParam(searchParams, "page"));
  const currentPage = Number.isInteger(currentPageParam) && currentPageParam > 0 ? currentPageParam : DEFAULT_QUERY.currentPage;

  const itemsPerPageParam = Number(getParam(searchParams, "perPage"));
  const itemsPerPage = Number.isInteger(itemsPerPageParam) && itemsPerPageParam > 0 ? itemsPerPageParam : DEFAULT_QUERY.itemsPerPage;

  return { searchTerm, sortColumnHash, sortDirection, currentPage, itemsPerPage };
}

export function buildGiftCertificatesSearchParams(query: GiftCertificatesQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.searchTerm) {
    params.set("q", query.searchTerm);
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
