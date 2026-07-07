import { TableSortDirection } from "@/components/ui/big-design";
import { GIFT_CERTIFICATE_STATUSES } from "@/lib/gift-certificates/status";
import { GiftCertificatesQuery, TriStateFilter } from "@/lib/gift-certificates/types";

export const DEFAULT_QUERY: GiftCertificatesQuery = {
  certificateNumber: "",
  status: [],
  balanceMin: undefined,
  balanceMax: undefined,
  recipientName: "",
  recipientEmail: "",
  recipientHasAccount: "any",
  purchasedAfter: "",
  purchasedBefore: "",
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

function getNumberParam(searchParams: RawSearchParams, key: string): number | undefined {
  const value = Number(getParam(searchParams, key));

  return Number.isFinite(value) && getParam(searchParams, key) !== undefined ? value : undefined;
}

function getTriStateParam(searchParams: RawSearchParams, key: string): TriStateFilter {
  const value = getParam(searchParams, key);

  return value === "yes" || value === "no" ? value : "any";
}

export function parseGiftCertificatesQuery(searchParams: RawSearchParams): GiftCertificatesQuery {
  const certificateNumber = getParam(searchParams, "certificateNumber") ?? DEFAULT_QUERY.certificateNumber;

  const statusParam = getParam(searchParams, "status");
  const status = statusParam
    ? statusParam
        .split(",")
        .filter((value): value is (typeof GIFT_CERTIFICATE_STATUSES)[number] =>
          GIFT_CERTIFICATE_STATUSES.includes(value as (typeof GIFT_CERTIFICATE_STATUSES)[number]),
        )
    : DEFAULT_QUERY.status;

  const balanceMin = getNumberParam(searchParams, "balanceMin");
  const balanceMax = getNumberParam(searchParams, "balanceMax");

  const recipientName = getParam(searchParams, "recipientName") ?? DEFAULT_QUERY.recipientName;
  const recipientEmail = getParam(searchParams, "recipientEmail") ?? DEFAULT_QUERY.recipientEmail;
  const recipientHasAccount = getTriStateParam(searchParams, "recipientHasAccount");

  const purchasedAfter = getParam(searchParams, "purchasedAfter") ?? DEFAULT_QUERY.purchasedAfter;
  const purchasedBefore = getParam(searchParams, "purchasedBefore") ?? DEFAULT_QUERY.purchasedBefore;

  const sortColumnHash = getParam(searchParams, "sort") ?? DEFAULT_QUERY.sortColumnHash;
  const sortDirectionParam = getParam(searchParams, "direction");
  const sortDirection: TableSortDirection = sortDirectionParam === "ASC" ? "ASC" : DEFAULT_QUERY.sortDirection;

  const currentPageParam = Number(getParam(searchParams, "page"));
  const currentPage = Number.isInteger(currentPageParam) && currentPageParam > 0 ? currentPageParam : DEFAULT_QUERY.currentPage;

  const itemsPerPageParam = Number(getParam(searchParams, "perPage"));
  const itemsPerPage = Number.isInteger(itemsPerPageParam) && itemsPerPageParam > 0 ? itemsPerPageParam : DEFAULT_QUERY.itemsPerPage;

  return {
    certificateNumber,
    status,
    balanceMin,
    balanceMax,
    recipientName,
    recipientEmail,
    recipientHasAccount,
    purchasedAfter,
    purchasedBefore,
    sortColumnHash,
    sortDirection,
    currentPage,
    itemsPerPage,
  };
}

export function buildGiftCertificatesSearchParams(query: GiftCertificatesQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.certificateNumber) {
    params.set("certificateNumber", query.certificateNumber);
  }

  if (query.status.length > 0) {
    params.set("status", query.status.join(","));
  }

  if (query.balanceMin !== undefined) {
    params.set("balanceMin", String(query.balanceMin));
  }

  if (query.balanceMax !== undefined) {
    params.set("balanceMax", String(query.balanceMax));
  }

  if (query.recipientName) {
    params.set("recipientName", query.recipientName);
  }

  if (query.recipientEmail) {
    params.set("recipientEmail", query.recipientEmail);
  }

  if (query.recipientHasAccount !== DEFAULT_QUERY.recipientHasAccount) {
    params.set("recipientHasAccount", query.recipientHasAccount);
  }

  if (query.purchasedAfter) {
    params.set("purchasedAfter", query.purchasedAfter);
  }

  if (query.purchasedBefore) {
    params.set("purchasedBefore", query.purchasedBefore);
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
