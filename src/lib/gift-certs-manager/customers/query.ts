// TODO: implement DEFAULT_QUERY and parseCustomersQuery
//  - export const DEFAULT_QUERY: CustomersQuery = { name: "", email: "",
//    date_created_min: "", date_created_max: "", sortColumn: "name",
//    direction: "ASC", page: 1, limit: 10 }
//  - parseCustomersQuery(searchParams): CustomersQuery - reads each field
//    off raw searchParams, falling back to DEFAULT_QUERY, validating
//    sortColumn/direction/page/limit

// TODO: implement buildCustomersSearchParams
//  - buildCustomersSearchParams(query): URLSearchParams - only sets a param
//    when it differs from DEFAULT_QUERY, same pattern as
//    gift-certificates/query.ts's buildGiftCertificatesSearchParams
