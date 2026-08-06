"use client";

import { useSyncExternalStore } from "react";
import { ActionResult } from "@/lib/actions/action-result";

interface Alert {
  id: number;
  type: "success" | "error";
  text: string;
  autoDismiss: boolean;
}

// Minimal pub/sub alert queue replacing BigDesign's createAlertsManager: one
// module-level list of alerts, subscribers notified on every change via
// useSyncExternalStore. One manager instance for the whole app: callers show
// alerts from anywhere (typically after a server action resolves or throws),
// and the single <ActionAlertsManager /> mounted in the root layout renders
// whatever's currently queued.
let alerts: Alert[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Alert[] {
  return alerts;
}

function dismiss(id: number): void {
  alerts = alerts.filter((alert) => alert.id !== id);
  notify();
}

function addAlert(type: Alert["type"], text: string, autoDismiss: boolean): void {
  const id = nextId++;

  alerts = [...alerts, { id, type, text, autoDismiss }];
  notify();

  if (autoDismiss) {
    setTimeout(() => dismiss(id), 5000);
  }
}

export function showSuccessAlert(message: string): void {
  addAlert("success", message, true);
}

export function showErrorAlert(message: string): void {
  addAlert("error", message, false);
}

// Runs a server action, showing a success alert for its message on success
// and an error alert (falling back to a generic message) if it either
// returns success: false or throws. Centralizes the try/catch every action
// call site would otherwise repeat.
export async function runServerAction(
  action: () => Promise<ActionResult>,
  fallbackErrorMessage = "Something went wrong. Please try again.",
): Promise<void> {
  try {
    const result = await action();

    if (result.success) {
      showSuccessAlert(result.message);
    } else {
      showErrorAlert(result.message || fallbackErrorMessage);
    }
  } catch (error) {
    showErrorAlert(error instanceof Error ? error.message : fallbackErrorMessage);
  }
}

export function ActionAlertsManager() {
  const currentAlerts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (currentAlerts.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "var(--spacing-large)",
        right: "var(--spacing-large)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-small)",
      }}
    >
      {currentAlerts.map((alert) => (
        <div
          key={alert.id}
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--spacing-medium)",
            minWidth: 280,
            maxWidth: 400,
            borderRadius: "var(--border-radius-normal)",
            boxShadow: "var(--shadow-raised)",
            padding: "var(--spacing-medium)",
            backgroundColor: alert.type === "success" ? "var(--color-success10)" : "var(--color-danger10)",
            border: `1px solid ${alert.type === "success" ? "var(--color-success40)" : "var(--color-danger40)"}`,
            color: "var(--color-secondary70)",
          }}
        >
          <span>{alert.text}</span>
          <button
            aria-label="Dismiss"
            onClick={() => dismiss(alert.id)}
            type="button"
            style={{
              background: "none",
              border: "none",
              color: "var(--color-secondary60)",
              cursor: "pointer",
              fontWeight: "var(--font-weight-semiBold)",
              lineHeight: 1,
              padding: 0,
            }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
