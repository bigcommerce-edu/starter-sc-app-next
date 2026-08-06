// TODO: Implement decorateGiftCertificatesWithRecipientAccounts - attach registered customer accounts to a gift certificate's
// recipient email, by looking it up via fetchCustomersByEmail
//  - the listing page only ever renders recipient account info, so this
//    only looks up (and only pays the request cost for) recipient emails,
//    in one batched request

// TODO: Implement decorateGiftCertificateWithAccounts - attach registered customer accounts to a gift certificate's
// sender/recipient emails, by looking them up via fetchCustomersByEmail
//  - the detail page renders both sender and recipient account info, so
//    this looks up both emails in a single batched request
