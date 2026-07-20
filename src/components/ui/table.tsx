"use client";

export interface TableColumn<TItem> {
  header: string;
  hash: string;
  render(item: TItem): React.ReactNode;
  align?: "left" | "right";
  hideHeader?: boolean;
  isSortable?: boolean;
  width?: number;
}

interface TableSortable {
  columnHash?: string;
  direction?: "ASC" | "DESC";
  onSort(columnHash: string, direction: "ASC" | "DESC"): void;
}

// Supports both pagination shapes used across the app: stateless
// previous/next-only (gift certificates — BigCommerce's v2 endpoint never
// reports a total count) and page-number-aware (customers, which does have a
// total). A caller passes whichever fields apply; the others are simply
// undefined.
interface TablePagination {
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  onItemsPerPageChange(limit: number): void;
  currentPage?: number;
  totalItems?: number;
  onPageChange?(page: number): void;
  onPrevious?(): void;
  onNext?(): void;
}

interface TableProps<TItem> {
  columns: TableColumn<TItem>[];
  items: TItem[];
  keyField: keyof TItem;
  itemName?: string;
  sortable?: TableSortable;
  pagination?: TablePagination;
}

// Replaces BigDesign's Table: a plain <table> plus a pagination footer.
// Keeps the same columns/sortable/pagination shape callers already use
// (gift-certificate-table.tsx, customer-table.tsx) so those files only need
// an import swap, not a rewrite.
export function Table<TItem>({ columns, items, keyField, itemName = "items", sortable, pagination }: TableProps<TItem>) {
  const handleSortClick = (column: TableColumn<TItem>) => {
    if (!sortable || !column.isSortable) {
      return;
    }

    const isActiveColumn = sortable.columnHash === column.hash;
    const nextDirection = isActiveColumn && sortable.direction === "ASC" ? "DESC" : "ASC";

    sortable.onSort(column.hash, nextDirection);
  };

  return (
    <div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.hash}
                onClick={column.isSortable ? () => handleSortClick(column) : undefined}
                style={{
                  textAlign: column.align ?? "left",
                  width: column.width,
                  padding: "var(--spacing-small)",
                  borderBottom: "1px solid var(--border-color)",
                  cursor: column.isSortable ? "pointer" : undefined,
                  fontSize: "var(--font-size-small)",
                  color: "var(--color-secondary60)",
                  visibility: column.hideHeader ? "hidden" : "visible",
                }}
              >
                {column.header}
                {column.isSortable && sortable?.columnHash === column.hash && (sortable.direction === "ASC" ? " ▲" : " ▼")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={String(item[keyField])}>
              {columns.map((column) => (
                <td
                  key={column.hash}
                  style={{
                    textAlign: column.align ?? "left",
                    padding: "var(--spacing-small)",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "var(--spacing-medium)",
          }}
        >
          <div style={{ fontSize: "var(--font-size-small)", color: "var(--color-secondary60)" }}>
            {pagination.totalItems !== undefined && `${pagination.totalItems} ${itemName}`}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-medium)" }}>
            <label style={{ fontSize: "var(--font-size-small)" }}>
              Per page{" "}
              <select
                onChange={(event) => pagination.onItemsPerPageChange(Number(event.target.value))}
                value={pagination.itemsPerPage}
              >
                {pagination.itemsPerPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", gap: "var(--spacing-xSmall)" }}>
              <button
                disabled={
                  pagination.onPageChange
                    ? pagination.currentPage === 1
                    : !pagination.onPrevious
                }
                onClick={() =>
                  pagination.onPageChange
                    ? pagination.onPageChange((pagination.currentPage ?? 1) - 1)
                    : pagination.onPrevious?.()
                }
                type="button"
              >
                Previous
              </button>
              <button
                disabled={
                  pagination.onPageChange
                    ? pagination.totalItems !== undefined &&
                      (pagination.currentPage ?? 1) * pagination.itemsPerPage >= pagination.totalItems
                    : !pagination.onNext
                }
                onClick={() =>
                  pagination.onPageChange
                    ? pagination.onPageChange((pagination.currentPage ?? 1) + 1)
                    : pagination.onNext?.()
                }
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
