"use client";

import { createAlertsManager } from "@bigcommerce/big-design";
import { AlertsManager } from "@/components/ui/big-design";
import { ActionResult } from "@/lib/actions/action-result";

// One manager instance for the whole app: callers show alerts from anywhere
// (typically after a server action resolves or throws), and the single
// <ActionAlertsManager /> mounted in the root layout renders whatever's
// currently queued.
const alertsManager = createAlertsManager();

export function showSuccessAlert(message: string): void {
  alertsManager.add({
    autoDismiss: true,
    messages: [{ text: message }],
    type: "success",
  });
}

export function showErrorAlert(message: string): void {
  alertsManager.add({
    autoDismiss: true,
    messages: [{ text: message }],
    type: "error",
  });
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
  return <AlertsManager manager={alertsManager} />;
}
