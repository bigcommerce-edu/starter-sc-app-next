"use client";

import { useEffect, useRef } from "react";

type ActionVariant = "primary" | "subtle";

const VARIANT_STYLE: Record<ActionVariant, React.CSSProperties> = {
  primary: { backgroundColor: "var(--color-primary)", color: "var(--color-white)", border: "1px solid var(--color-primary)" },
  subtle: { backgroundColor: "transparent", color: "var(--color-secondary70)", border: "1px solid transparent" },
};

interface ModalAction {
  text: string;
  variant: ActionVariant;
  onClick(): void;
  isLoading?: boolean;
}

interface ModalProps {
  actions: ModalAction[];
  closeOnEscKey?: boolean;
  header: string;
  isOpen: boolean;
  onClose(): void;
  children: React.ReactNode;
}

// Replaces BigDesign's Modal with the native <dialog> element:
// showModal()/close() give us focus-trapping and a ::backdrop for free, and
// the "cancel" event (fired on Esc) is exactly BigDesign's closeOnEscKey
// behavior, so no key-handling code is needed here at all.
export function Modal({ actions, closeOnEscKey = true, header, isOpen, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    const handleClose = () => onClose();
    const handleCancel = (event: Event) => {
      if (!closeOnEscKey) {
        event.preventDefault();
        return;
      }

      onClose();
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("cancel", handleCancel);

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [closeOnEscKey, onClose]);

  return (
    <dialog
      ref={dialogRef}
      onClick={(event) => {
        // A click that lands on the <dialog> element itself (not a
        // descendant) is a click on the backdrop area, since the dialog's
        // own content is sized to its children.
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
      style={{
        border: "none",
        borderRadius: "var(--border-radius-normal)",
        boxShadow: "var(--shadow-floating)",
        padding: "var(--spacing-large)",
        width: "min(480px, 90vw)",
      }}
    >
      <h4 style={{ margin: "0 0 var(--spacing-medium)", fontSize: "var(--font-size-large)", fontWeight: "var(--font-weight-semiBold)" }}>
        {header}
      </h4>
      <div style={{ marginBottom: "var(--spacing-large)" }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--spacing-small)" }}>
        {actions.map((action) => (
          <button
            key={action.text}
            disabled={action.isLoading}
            onClick={action.onClick}
            type="button"
            style={{
              borderRadius: "var(--border-radius-normal)",
              padding: "var(--spacing-xSmall) var(--spacing-medium)",
              fontWeight: "var(--font-weight-semiBold)",
              cursor: action.isLoading ? "not-allowed" : "pointer",
              ...VARIANT_STYLE[action.variant],
            }}
          >
            {action.isLoading ? "..." : action.text}
          </button>
        ))}
      </div>
    </dialog>
  );
}
