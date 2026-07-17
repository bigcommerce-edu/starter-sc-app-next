// Replaces BigDesign's Panel: a bordered card with an optional header.
export function Panel({ header, children }: { header?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid var(--border-color)",
        borderRadius: "var(--border-radius-normal)",
        padding: "var(--spacing-large)",
      }}
    >
      {header && (
        <h4
          style={{
            marginTop: 0,
            marginBottom: "var(--spacing-medium)",
            fontSize: "var(--font-size-large)",
            fontWeight: "var(--font-weight-semiBold)",
          }}
        >
          {header}
        </h4>
      )}
      {children}
    </div>
  );
}
