// Standard return shape for Server Actions, so callers can show
// success/error alerts without the action needing to throw for expected
// failures. runServerAction (components/ui/action-alerts.tsx) handles both
// this and thrown errors.
export interface ActionResult {
  success: boolean;
  message: string;
}
