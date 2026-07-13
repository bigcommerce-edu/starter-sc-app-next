// Thrown by lib/bc-auth's orchestration functions so routes can distinguish
// failure modes in their catch block (e.g. map to a 401 vs. 403) without
// bc-auth itself knowing anything about HTTP — that mapping is the route's
// job as the thing actually speaking HTTP, not this library's.
export class StoreNotInstalledError extends Error {
  constructor(storeHash: string) {
    super(`Store "${storeHash}" is not installed.`);
    this.name = "StoreNotInstalledError";
  }
}
