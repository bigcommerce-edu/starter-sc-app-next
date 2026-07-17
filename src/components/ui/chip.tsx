"use client";

// Replaces BigDesign's Chip: a removable tag rendered for each active filter.
export function Chip({ label, onDelete }: { label: string; onDelete(): void }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--spacing-xxSmall)",
        backgroundColor: "var(--color-secondary20)",
        borderRadius: "9999px",
        padding: "var(--spacing-xxSmall) var(--spacing-small)",
        margin: "var(--spacing-xxSmall) var(--spacing-xSmall) var(--spacing-xxSmall) 0",
        fontSize: "var(--font-size-small)",
      }}
    >
      {label}
      <button
        aria-label={`Remove ${label}`}
        onClick={onDelete}
        type="button"
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          color: "var(--color-secondary60)",
          fontWeight: "var(--font-weight-semiBold)",
          lineHeight: 1,
          padding: 0,
        }}
      >
        &times;
      </button>
    </span>
  );
}
