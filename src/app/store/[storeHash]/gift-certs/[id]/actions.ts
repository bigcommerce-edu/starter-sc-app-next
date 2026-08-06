"use server";

export function updateGiftCertificateStatus(): void {
  // TODO: Implement updateGiftCertificateStatus
  //  - Fetch the certificate fresh by id, then call
  //    updateGiftCertificateStatus from gift-certificates-api.ts
  //  - Return an ActionResult
  //  - Report a missing record distinctly from other failures (see
  //    isNotFoundError in errors/app-error.ts) - it most likely means the
  //    certificate was deleted after the page rendered, so the user needs
  //    to reload rather than see a generic error
  //  - No isAuthorizedForStore check yet - that lands once session/auth
  //    exists. No cache tag revalidation yet either - that's the caching
  //    enhancement.
}

export function refillGiftCertificateBalance(): void {
  // TODO: Implement refillGiftCertificateBalance
  //  - Fetch the certificate fresh, validate it's active/expired and the new
  //    balance lands above the current balance and no higher than the
  //    original amount - a "refill" that lowers the balance is a debit, which
  //    this action deliberately won't do - then call
  //    refillGiftCertificateBalance from gift-certificates-api.ts
  //  - Report a missing record distinctly here too, the same way
}
