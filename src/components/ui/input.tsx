"use client";

import { useId } from "react";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  label?: string;
}

// Replaces BigDesign's Input: a labeled, controlled text/number input.
export function Input({ label, style, ...rest }: InputProps) {
  const id = useId();

  return (
    <div style={{ marginBottom: "var(--spacing-medium)" }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: "block",
            marginBottom: "var(--spacing-xxSmall)",
            fontSize: "var(--font-size-small)",
            fontWeight: "var(--font-weight-semiBold)",
          }}
        >
          {label}
        </label>
      )}
      <input
        {...rest}
        id={id}
        style={{
          width: "100%",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--border-radius-normal)",
          padding: "var(--spacing-xSmall)",
          ...style,
        }}
      />
    </div>
  );
}
