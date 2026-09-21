// TODO: Implement the CredentialsStore interface against a Cloudflare D1
// database.
//
// TODO: D1 is SQLite over a binding rather than a local file, so every method
// is async and statements are prepared/bound rather than run synchronously.
//
// TODO: Route every method through shared error handling, so a raw D1 error
// never reaches a client response.
//
// TODO: Encrypt the store access token on write and decrypt it on read, the
// same way the other drivers do.
//
// TODO: D1 has no interactive transactions — use batch() where a set of
// statements must apply together.
