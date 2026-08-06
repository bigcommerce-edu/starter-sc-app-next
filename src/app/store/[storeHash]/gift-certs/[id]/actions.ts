"use server";

export function updateGiftCertificateStatus(): void {
  // TODO: Implement updateGiftCertificateStatus
  //  - Fetch the certificate fresh by id, then call
  //    updateGiftCertificateStatus from gift-certificates-api.ts
  //  - Return an ActionResult
  //  - No isAuthorizedForStore check yet - that lands once session/auth
  //    exists. No cache tag revalidation yet either - that's the caching
  //    enhancement.
}

export function refillGiftCertificateBalance(): void {
  // TODO: Implement refillGiftCertificateBalance
  //  - Fetch the certificate fresh, validate it's active/expired and the new
  //    balance doesn't exceed the original amount, then call
  //    refillGiftCertificateBalance from gift-certificates-api.ts
}
