"use client";

import { useId } from "react";

interface DatepickerProps {
  label?: string;
  value?: string;
  onDateChange(isoDate: string): void;
}

// Replaces BigDesign's Datepicker with a plain <input type="date">. Only
// used for two plain "yyyy-MM-dd" filter fields (see customer-filters.tsx),
// so this doesn't need to replicate BigDesign's dateFormat prop or its
// richer picker UI — the native date input already returns "yyyy-MM-dd".
// onDateChange's name is kept (matching the old BigDesign prop) even though
// it now always receives a date-only string, since customer-filters.tsx
// already normalizes the value it's given (see its toDateOnly helper) before
// this component ever sees callers relying on a fuller ISO string.
export function Datepicker({ label, value, onDateChange }: DatepickerProps) {
  const id = useId();

  return (
    <div>
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
        id={id}
        type="date"
        value={value ?? ""}
        onChange={(event) => onDateChange(event.target.value)}
        style={{
          width: "100%",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--border-radius-normal)",
          padding: "var(--spacing-xSmall)",
        }}
      />
    </div>
  );
}
