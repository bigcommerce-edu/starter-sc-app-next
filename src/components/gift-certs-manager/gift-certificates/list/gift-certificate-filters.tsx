"use client";

import { useState } from "react";
import { Box, Button, Chip, Flex, Form, FormGroup, Input, Modal } from "@/components/ui/big-design";
import { FilterListIcon } from "@/components/ui/big-design-icons";
import { GiftCertificatesQuery } from "@/lib/gift-certs-manager/gift-certificates/types";
import { DEFAULT_QUERY } from "@/lib/gift-certs-manager/gift-certificates/query";

// Fields that make up the advanced filters, i.e. everything in
// GiftCertificatesQuery except sorting/paging, which the table controls
// directly. Sender name/email aren't exposed here since they aren't shown as
// grid columns, so filtering on them would be confusing.
type FilterFields = Omit<GiftCertificatesQuery, "direction" | "page" | "limit">;

const DEFAULT_FILTERS: FilterFields = {
  code: DEFAULT_QUERY.code,
  to_name: DEFAULT_QUERY.to_name,
  to_email: DEFAULT_QUERY.to_email,
};

function isFilterActive(filters: FilterFields): boolean {
  return (
    filters.code !== DEFAULT_FILTERS.code ||
    filters.to_name !== DEFAULT_FILTERS.to_name ||
    filters.to_email !== DEFAULT_FILTERS.to_email
  );
}

interface GiftCertificateFiltersProps {
  query: GiftCertificatesQuery;
  onChange(filters: FilterFields): void;
}

// A Filter button opens a modal with every filterable field; applied filters
// render as removable chips. Nothing takes effect until the caller's
// onChange is invoked (Apply, chip delete, or Clear all) — GiftCertificateTable
// owns the actual query/navigation.
export function GiftCertificateFilters({ query, onChange }: GiftCertificateFiltersProps) {
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
          {query.code && (
            <Chip
              label={`Certificate #: ${query.code}`}
              onDelete={() => removeFilter("code")}
            />
          )}
          {query.to_name && (
            <Chip label={`Recipient: ${query.to_name}`} onDelete={() => removeFilter("to_name")} />
          )}
          {query.to_email && (
            <Chip label={`Recipient email: ${query.to_email}`} onDelete={() => removeFilter("to_email")} />
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
        header="Filter gift certificates"
        isOpen={isModalOpen}
        onClose={closeModal}
      >
        <Form fullWidth>
          <FormGroup>
            <Input
              label="Certificate #"
              onChange={(event) => setDraftField("code", event.target.value)}
              value={draft.code}
            />
          </FormGroup>

          <FormGroup>
            <Input
              label="Recipient name"
              onChange={(event) => setDraftField("to_name", event.target.value)}
              value={draft.to_name}
            />
          </FormGroup>

          <FormGroup>
            <Input
              label="Recipient email contains"
              onChange={(event) => setDraftField("to_email", event.target.value)}
              value={draft.to_email}
            />
          </FormGroup>
        </Form>
      </Modal>
    </Box>
  );
}
