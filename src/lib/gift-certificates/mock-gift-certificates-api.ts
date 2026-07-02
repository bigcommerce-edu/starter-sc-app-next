import { mockGiftCertificates } from "@/lib/gift-certificates/mock-gift-certificates";
import { GiftCertificate, GiftCertificatesQuery, GiftCertificatesResult } from "@/lib/gift-certificates/types";

// Stands in for a server-side API call, invoked directly from GiftCertificatesView.
// Replace the body with a real request (e.g. fetch to a backend endpoint) once
// one exists — the query/result shape is designed to map directly onto request
// params and a paginated response.
export async function fetchGiftCertificates(query: GiftCertificatesQuery): Promise<GiftCertificatesResult> {
  const normalizedSearchTerm = query.searchTerm.trim().toLowerCase();

  const filtered = normalizedSearchTerm
    ? mockGiftCertificates.filter((certificate) =>
        [certificate.certificateNumber, certificate.recipientName, certificate.recipientEmail].some((field) =>
          field.toLowerCase().includes(normalizedSearchTerm),
        ),
      )
    : mockGiftCertificates;

  const sortKey = query.sortColumnHash as keyof GiftCertificate;
  const sorted = [...filtered].sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];

    if (typeof aValue === "number" && typeof bValue === "number") {
      return query.sortDirection === "ASC" ? aValue - bValue : bValue - aValue;
    }

    const comparison = String(aValue).localeCompare(String(bValue));

    return query.sortDirection === "ASC" ? comparison : -comparison;
  });

  const startIndex = (query.currentPage - 1) * query.itemsPerPage;
  const items = sorted.slice(startIndex, startIndex + query.itemsPerPage);

  return { items, totalItems: sorted.length };
}
