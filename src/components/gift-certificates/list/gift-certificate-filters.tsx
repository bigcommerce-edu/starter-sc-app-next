"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Datepicker,
  Fieldset,
  Flex,
  FilterListIcon,
  Form,
  FormGroup,
  Grid,
  Input,
  Modal,
  MultiSelect,
} from "@/components/ui/big-design";
import { GIFT_CERTIFICATE_STATUSES, GIFT_CERTIFICATE_STATUS_LABEL } from "@/lib/gift-certificates/status";
import { GiftCertificateStatus, GiftCertificatesQuery } from "@/lib/gift-certificates/types";
import { DEFAULT_QUERY } from "@/lib/gift-certificates/query";

const STATUS_OPTIONS: Array<{ value: GiftCertificateStatus; content: string }> = GIFT_CERTIFICATE_STATUSES.map(
  (status) => ({ value: status, content: GIFT_CERTIFICATE_STATUS_LABEL[status] }),
);

// Fields that make up the advanced filters, i.e. everything in GiftCertificatesQuery
// except sorting/paging, which the table controls directly.
type FilterFields = Omit<GiftCertificatesQuery, "sortColumnHash" | "sortDirection" | "currentPage" | "itemsPerPage">;

const DEFAULT_FILTERS: FilterFields = {
  certificateNumber: DEFAULT_QUERY.certificateNumber,
  status: DEFAULT_QUERY.status,
  balanceMin: DEFAULT_QUERY.balanceMin,
  balanceMax: DEFAULT_QUERY.balanceMax,
  recipientName: DEFAULT_QUERY.recipientName,
  recipientEmail: DEFAULT_QUERY.recipientEmail,
  purchasedAfter: DEFAULT_QUERY.purchasedAfter,
  purchasedBefore: DEFAULT_QUERY.purchasedBefore,
};

function isFilterActive(filters: FilterFields): boolean {
  return (
    filters.certificateNumber !== DEFAULT_FILTERS.certificateNumber ||
    filters.status.length > 0 ||
    filters.balanceMin !== DEFAULT_FILTERS.balanceMin ||
    filters.balanceMax !== DEFAULT_FILTERS.balanceMax ||
    filters.recipientName !== DEFAULT_FILTERS.recipientName ||
    filters.recipientEmail !== DEFAULT_FILTERS.recipientEmail ||
    filters.purchasedAfter !== DEFAULT_FILTERS.purchasedAfter ||
    filters.purchasedBefore !== DEFAULT_FILTERS.purchasedBefore
  );
}

interface GiftCertificateFiltersProps {
  query: GiftCertificatesQuery;
  onChange(filters: FilterFields): void;
}

// Implements the BigDesign "advanced filtering" pattern: a Filter button opens
// a modal with every filterable field, applied filters render as removable
// chips, and nothing takes effect until the caller's onChange is invoked (on
// Apply, chip delete, or Clear all). GiftCertificateTable owns the actual
// query/navigation; this component only stages and reports filter values.
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
          {query.certificateNumber && (
            <Chip
              label={`Certificate #: ${query.certificateNumber}`}
              onDelete={() => removeFilter("certificateNumber")}
            />
          )}
          {query.status.map((status) => (
            <Chip
              key={status}
              label={`Status: ${GIFT_CERTIFICATE_STATUS_LABEL[status]}`}
              onDelete={() => onChange({ ...query, status: query.status.filter((value) => value !== status) })}
            />
          ))}
          {query.balanceMin !== undefined && (
            <Chip label={`Min balance: ${query.balanceMin}`} onDelete={() => removeFilter("balanceMin")} />
          )}
          {query.balanceMax !== undefined && (
            <Chip label={`Max balance: ${query.balanceMax}`} onDelete={() => removeFilter("balanceMax")} />
          )}
          {query.recipientName && (
            <Chip label={`Recipient: ${query.recipientName}`} onDelete={() => removeFilter("recipientName")} />
          )}
          {query.recipientEmail && (
            <Chip label={`Recipient email: ${query.recipientEmail}`} onDelete={() => removeFilter("recipientEmail")} />
          )}
          {query.purchasedAfter && (
            <Chip label={`Purchased after: ${query.purchasedAfter}`} onDelete={() => removeFilter("purchasedAfter")} />
          )}
          {query.purchasedBefore && (
            <Chip label={`Purchased before: ${query.purchasedBefore}`} onDelete={() => removeFilter("purchasedBefore")} />
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
              onChange={(event) => setDraftField("certificateNumber", event.target.value)}
              value={draft.certificateNumber}
            />
          </FormGroup>

          <FormGroup>
            <MultiSelect
              label="Status"
              onOptionsChange={(value) => setDraftField("status", value)}
              options={STATUS_OPTIONS}
              value={draft.status}
            />
          </FormGroup>

          <FormGroup>
            <Fieldset legend="Current balance">
              <Grid gridColumns={{ mobile: "1fr", tablet: "1fr 1fr" }} gridGap="1rem">
                <Input
                  min={0}
                  onChange={(event) =>
                    setDraftField("balanceMin", event.target.value === "" ? undefined : Number(event.target.value))
                  }
                  placeholder="Min."
                  type="number"
                  value={draft.balanceMin ?? ""}
                />
                <Input
                  min={0}
                  onChange={(event) =>
                    setDraftField("balanceMax", event.target.value === "" ? undefined : Number(event.target.value))
                  }
                  placeholder="Max."
                  type="number"
                  value={draft.balanceMax ?? ""}
                />
              </Grid>
            </Fieldset>
          </FormGroup>

          <FormGroup>
            <Input
              label="Recipient name"
              onChange={(event) => setDraftField("recipientName", event.target.value)}
              value={draft.recipientName}
            />
          </FormGroup>

          <FormGroup>
            <Input
              label="Recipient email"
              onChange={(event) => setDraftField("recipientEmail", event.target.value)}
              value={draft.recipientEmail}
            />
          </FormGroup>

          <FormGroup>
            <Grid gridColumns={{ mobile: "1fr", tablet: "1fr 1fr" }} gridGap="1rem">
              <Datepicker
                label="Purchased after"
                onDateChange={(date) => setDraftField("purchasedAfter", date)}
                value={draft.purchasedAfter || undefined}
              />
              <Datepicker
                label="Purchased before"
                onDateChange={(date) => setDraftField("purchasedBefore", date)}
                value={draft.purchasedBefore || undefined}
              />
            </Grid>
          </FormGroup>
        </Form>
      </Modal>
    </Box>
  );
}
