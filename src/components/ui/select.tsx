"use client";

import { useId } from "react";

interface SelectOption<T extends string> {
  value: T;
  content: string;
}

interface SelectProps<T extends string> {
  label?: string;
  value: T;
  options: SelectOption<T>[];
  onOptionChange(value: T): void;
}

// Replaces BigDesign's Select. Needs "use client" since it wires a native
// <select> onChange handler directly, even though the component itself
// holds no state — value/onOptionChange are always externally controlled.
export function Select<T extends string>({ label, value, options, onOptionChange }: SelectProps<T>) {
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
      <select
        id={id}
        value={value}
        onChange={(event) => onOptionChange(event.target.value as T)}
        style={{
          width: "100%",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--border-radius-normal)",
          padding: "var(--spacing-xSmall)",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.content}
          </option>
        ))}
      </select>
    </div>
  );
}
