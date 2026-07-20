type BadgeVariant = "success" | "secondary" | "warning" | "danger";

const VARIANT_STYLE: Record<BadgeVariant, { background: string; color: string }> = {
  success: { background: "var(--color-success20)", color: "var(--color-success70)" },
  secondary: { background: "var(--color-secondary20)", color: "var(--color-secondary70)" },
  warning: { background: "var(--color-warning20)", color: "var(--color-warning70)" },
  danger: { background: "var(--color-danger20)", color: "var(--color-danger70)" },
};

// Replaces BigDesign's Badge: a colored pill matching the same variant names
// used throughout the app (see gift-certs-manager/gift-certificates/status.ts).
export function Badge({ label, variant }: { label: string; variant: BadgeVariant }) {
  const { background, color } = VARIANT_STYLE[variant];

  return (
    <span
      style={{
        display: "inline-block",
        borderRadius: "9999px",
        padding: "var(--spacing-xxSmall) var(--spacing-xSmall)",
        fontSize: "var(--font-size-small)",
        fontWeight: "var(--font-weight-semiBold)",
        backgroundColor: background,
        color,
      }}
    >
      {label}
    </span>
  );
}
