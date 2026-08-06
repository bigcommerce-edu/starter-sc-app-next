"use client";

type ButtonVariant = "primary" | "secondary" | "subtle";

const VARIANT_STYLE: Record<ButtonVariant, React.CSSProperties> = {
  primary: { backgroundColor: "var(--color-primary)", color: "var(--color-white)", border: "1px solid var(--color-primary)" },
  secondary: { backgroundColor: "var(--color-white)", color: "var(--color-primary)", border: "1px solid var(--color-primary)" },
  subtle: { backgroundColor: "transparent", color: "var(--color-secondary70)", border: "1px solid transparent" },
};

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  iconLeft?: React.ReactNode;
  iconOnly?: React.ReactNode;
  isLoading?: boolean;
  children?: React.ReactNode;
}

// Replaces BigDesign's Button. A Client Component since every current call
// site wires an onClick handler and already lives inside a "use client" file.
export function Button({
  variant = "secondary",
  iconLeft,
  iconOnly,
  isLoading,
  disabled,
  children,
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || isLoading}
      type={rest.type ?? "button"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--spacing-xxSmall)",
        borderRadius: "var(--border-radius-normal)",
        padding: iconOnly ? "var(--spacing-xSmall)" : "var(--spacing-xSmall) var(--spacing-medium)",
        fontWeight: "var(--font-weight-semiBold)",
        cursor: disabled || isLoading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...VARIANT_STYLE[variant],
        ...style,
      }}
    >
      {isLoading ? "..." : iconOnly ?? (iconLeft && <>{iconLeft}</>)}
      {!iconOnly && !isLoading && children}
    </button>
  );
}
