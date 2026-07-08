"use client";

import { useState } from "react";
import { Box, Button, Chip, Flex, FilterListIcon, Form, FormGroup, Input, Modal, MultiSelect } from "@/components/ui/big-design";
import { Channel } from "@/lib/channels/types";
import { CustomersQuery } from "@/lib/customers/types";
import { DEFAULT_QUERY } from "@/lib/customers/query";

// Fields that make up the advanced filters, i.e. everything in CustomersQuery
// except sorting/paging, which the table controls directly.
type FilterFields = Omit<CustomersQuery, "direction" | "page" | "limit">;

const DEFAULT_FILTERS: FilterFields = {
  name: DEFAULT_QUERY.name,
  email: DEFAULT_QUERY.email,
  origin_channel_id: DEFAULT_QUERY.origin_channel_id,
};

function isFilterActive(filters: FilterFields): boolean {
  return (
    filters.name !== DEFAULT_FILTERS.name ||
    filters.email !== DEFAULT_FILTERS.email ||
    filters.origin_channel_id.length > 0
  );
}

interface CustomerFiltersProps {
  query: CustomersQuery;
  channels: Channel[];
  onChange(filters: FilterFields): void;
}

// Same BigDesign "advanced filtering" pattern used for gift certificates: a
// Filter button opens a modal with every filterable field, applied filters
// render as removable chips, and nothing takes effect until Apply/chip
// delete/Clear all. CustomerTable owns the actual query/navigation.
export function CustomerFilters({ query, channels, onChange }: CustomerFiltersProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<FilterFields>(query);

  const channelOptions = channels.map((channel) => ({ value: channel.id, content: channel.name }));

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

  const getChannelName = (channelId: number) => channels.find((channel) => channel.id === channelId)?.name ?? channelId;

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
          {query.origin_channel_id.map((channelId) => (
            <Chip
              key={channelId}
              label={`Origin Channel: ${getChannelName(channelId)}`}
              onDelete={() =>
                onChange({
                  ...query,
                  origin_channel_id: query.origin_channel_id.filter((id) => id !== channelId),
                })
              }
            />
          ))}
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
            <Input label="Email" onChange={(event) => setDraftField("email", event.target.value)} value={draft.email} />
          </FormGroup>

          <FormGroup>
            <MultiSelect
              label="Origin Channel"
              onOptionsChange={(value) => setDraftField("origin_channel_id", value)}
              options={channelOptions}
              value={draft.origin_channel_id}
            />
          </FormGroup>
        </Form>
      </Modal>
    </Box>
  );
}
