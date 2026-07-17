// Replaces BigDesign's Form/FormGroup: pure layout, no client behavior of
// their own (the controlled inputs inside them are what actually needs
// "use client").
export function Form({ fullWidth, children }: { fullWidth?: boolean; children: React.ReactNode }) {
  return <form style={{ width: fullWidth ? "100%" : undefined }}>{children}</form>;
}

export function FormGroup({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: "var(--spacing-small)" }}>{children}</div>;
}
