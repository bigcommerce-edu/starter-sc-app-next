import { NextResponse } from "next/server";

// One shared shape for every Route Handler's failure response
// ({ error: string }, matching status) — used across app/api/**, so a
// failure body's shape never depends on which route happens to be
// responding, and so no route can trivially regress into an unfiltered
// catch that returns a raw error's message/stack.
export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
