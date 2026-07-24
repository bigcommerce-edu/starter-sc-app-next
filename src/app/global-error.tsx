"use client";

// Last-resort boundary: only rendered if an error escapes the root layout
// itself (so [storeHash]/error.tsx and everything else below it did NOT
// catch it) — Next requires this to render its own <html>/<body> since it
// replaces the root layout entirely when active. Deliberately minimal (no
// BigDesign/styled-components) since the root layout — the thing that would
// normally provide those — is exactly what may have failed to render.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: "480px", margin: "80px auto", textAlign: "center", fontFamily: "sans-serif" }}>
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Try again, or reload the page.</p>
          <button onClick={reset} type="button">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
