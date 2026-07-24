"use client";

import { useState } from "react";
import { Box, Button, Chip, Datepicker, Flex, Form, FormGroup, Input, Modal } from "@/components/ui/big-design";
import { FilterListIcon } from "@/components/ui/big-design-icons";
import { CustomersQuery } from "@/lib/gift-certs-manager/customers/types";
import { DEFAULT_QUERY } from "@/lib/gift-certs-manager/customers/query";

// Fields that make up the advanced filters, i.e. everything in CustomersQuery
// except sorting/paging, which the table controls directly.
type FilterFields = Omit<CustomersQuery, "sortColumn" | "direction" | "page" | "limit">;

const DEFAULT_FILTERS: FilterFields = {
  name: DEFAULT_QUERY.name,
  email: DEFAULT_QUERY.email,
  date_created_min: DEFAULT_QUERY.date_created_min,
  date_created_max: DEFAULT_QUERY.date_created_max,
};

// Datepicker's onDateChange fires a full ISO datetime string normalized to
// UTC via toISOString(), even though the Date was constructed from the
// browser's local timezone — naively slicing the first 10 characters would
// shift the selected date back a day for any user east of UTC. Reading the
// parsed Date's local getters (getFullYear/getMonth/getDate) instead
// recovers the day the user actually clicked.
function toDateOnly(date: string): string {
  const parsed = new Date(date);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isFilterActive(filters: FilterFields): boolean {
  return (
    filters.name !== DEFAULT_FILTERS.name ||
    filters.email !== DEFAULT_FILTERS.email ||
    filters.date_created_min !== DEFAULT_FILTERS.date_created_min ||
    filters.date_created_max !== DEFAULT_FILTERS.date_created_max
  );
}

interface CustomerFiltersProps {
  query: CustomersQuery;
  onChange(filters: FilterFields): void;
}

// A Filter button opens a modal with every filterable field; applied filters
// render as removable chips. Nothing takes effect until Apply/chip
// delete/Clear all — CustomerTable owns the actual query/navigation.
export function CustomerFilters({ query, onChange }: CustomerFiltersProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<FilterFields>(query);

  const setDraftField = <K extends keyof FilterFields>(key: K, value: FilterFields[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const openModal = () => {
    setDraft(query);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const applyFilters = () => {
    onChange(draft);
    closeModal();
  };

  const clearAllFilters = () => {
    onChange(DEFAULT_FILTERS);
  };

  const removeFilter = <K extends keyof FilterFields>(key: K) => {
    onChange({ ...query, [key]: DEFAULT_FILTERS[key] });
  };

  return (
    <Box marginBottom="medium">
      <Flex justifyContent="flex-end">
        <Button iconLeft={<FilterListIcon />} onClick={openModal} variant="secondary">
          Filter
        </Button>
      </Flex>

      {isFilterActive(query) && (
        <Flex alignItems="center" flexWrap="wrap" marginTop="medium">
          {query.name && <Chip label={`Name: ${query.name}`} onDelete={() => removeFilter("name")} />}
          {query.email && <Chip label={`Email: ${query.email}`} onDelete={() => removeFilter("email")} />}
          {query.date_created_min && (
            <Chip
              label={`Registered after: ${query.date_created_min}`}
              onDelete={() => removeFilter("date_created_min")}
            />
          )}
          {query.date_created_max && (
            <Chip
              label={`Registered before: ${query.date_created_max}`}
              onDelete={() => removeFilter("date_created_max")}
            />
          )}
          <Button onClick={clearAllFilters} variant="subtle">
            Clear all filters
          </Button>
        </Flex>
      )}

      <Modal
        actions={[
          { text: "Cancel", variant: "subtle", onClick: closeModal },
          { text: "Apply", variant: "primary", onClick: applyFilters },
        ]}
        closeOnEscKey
        header="Filter customers"
        isOpen={isModalOpen}
        onClose={closeModal}
      >
        <Form fullWidth>
          <FormGroup>
            <Input label="Name" onChange={(event) => setDraftField("name", event.target.value)} value={draft.name} />
          </FormGroup>

          <FormGroup>
            <Input
              label="Email (exact match)"
              onChange={(event) => setDraftField("email", event.target.value)}
              value={draft.email}
            />
          </FormGroup>

          <FormGroup>
            <Datepicker
              dateFormat="yyyy-MM-dd"
              label="Registered after"
              onDateChange={(date) => setDraftField("date_created_min", toDateOnly(date))}
              value={draft.date_created_min || undefined}
            />
          </FormGroup>

          <FormGroup>
            <Datepicker
              dateFormat="yyyy-MM-dd"
              label="Registered before"
              onDateChange={(date) => setDraftField("date_created_max", toDateOnly(date))}
              value={draft.date_created_max || undefined}
            />
          </FormGroup>
        </Form>
      </Modal>
    </Box>
  );
}
