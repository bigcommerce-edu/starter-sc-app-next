// Standard return shape for server actions ("use server" functions), so
// callers can show success/error alerts without needing the action to throw
// for expected failure cases. Actions that legitimately fail before ever
// reaching an API request/response (e.g. validation) should return
// { success: false, message } rather than throwing; runServerAction (see
// components/ui/action-alerts.tsx) handles both this and thrown errors.
export interface ActionResult {
  success: boolean;
  message: string;
}
