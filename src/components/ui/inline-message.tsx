"use client";

type MessageType = "warning" | "error";

const TYPE_STYLE: Record<MessageType, { background: string; border: string }> = {
  warning: { background: "var(--color-warning10)", border: "var(--color-warning40)" },
  error: { background: "var(--color-danger10)", border: "var(--color-danger40)" },
};

interface InlineMessageAction {
  text: string;
  onClick(): void;
  isLoading?: boolean;
}

interface InlineMessageProps {
  header?: string;
  messages: { text: string }[];
  type: MessageType;
  actions?: InlineMessageAction[];
}

// Replaces BigDesign's InlineMessage. Always "use client": one of its two
// call sites (data-mode-banner.tsx) needs no interactivity, but the other
// (app-extension-status-banner) needs a clickable action, and splitting one
// small banner component in two just for that isn't worth it.
export function InlineMessage({ header, messages, type, actions }: InlineMessageProps) {
  const { background, border } = TYPE_STYLE[type];

  return (
    <div
      style={{
        backgroundColor: background,
        border: `1px solid ${border}`,
        borderRadius: "var(--border-radius-normal)",
        padding: "var(--spacing-medium)",
      }}
    >
      {header && <p style={{ margin: 0, fontWeight: "var(--font-weight-semiBold)" }}>{header}</p>}
      {messages.map((message) => (
        <p key={message.text} style={{ margin: "var(--spacing-xxSmall) 0 0" }}>
          {message.text}
        </p>
      ))}
      {actions && actions.length > 0 && (
        <div style={{ marginTop: "var(--spacing-small)", display: "flex", gap: "var(--spacing-small)" }}>
          {actions.map((action) => (
            <button
              key={action.text}
              disabled={action.isLoading}
              onClick={action.onClick}
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                cursor: action.isLoading ? "not-allowed" : "pointer",
                fontWeight: "var(--font-weight-semiBold)",
                padding: 0,
              }}
            >
              {action.isLoading ? "..." : action.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
