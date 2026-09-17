// The slice of Cloudflare's D1 API this driver uses, declared structurally so
// the driver compiles without the Cloudflare type packages installed. A real
// D1Database binding satisfies these, so the adapter that obtains one can pass
// it straight in.
//
// Deliberately narrower than D1Database/D1PreparedStatement: only the methods
// below are used, and only the fields of their results that this driver reads.
// Widening it to mirror the upstream types would just reproduce definitions
// that can change without notice.
export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike;
  first<TRow>(): Promise<TRow | null>;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1StatementLike;
  batch(statements: D1StatementLike[]): Promise<unknown>;
}
