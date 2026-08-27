// TODO: define SortDirection
//  - "ASC" | "DESC", matching BigDesign's TableSortDirection type,
//    re-declared here so this file has no dependency on BigDesign -
//    gift-certificates/types.ts's own SortDirection should be replaced with
//    an import of this one, since both places would otherwise duplicate
//    the same type

// TODO: define CUSTOMERS_PATH
//  - export const CUSTOMERS_PATH = "/v3/customers" - BigCommerce's v3
//    customers endpoint has no single-resource path, even a single lookup
//    goes through this path with filters (e.g. id:in) rather than a /{id}
//    suffix

// TODO: define the Customer resource
//  - { id, first_name, last_name, email, origin_channel_id,
//    channel_ids: number[], store_credit_amounts: Array<{ amount: string }>,
//    date_created } - matches the BigCommerce v3 customer resource's field
//    names directly

// TODO: implement sumStoreCredit
//  - Reduces store_credit_amounts to a single number (this demo assumes a
//    single-currency store)

// TODO: define CustomerWithChannels
//  - Extends Customer with originChannel/channels (Channel objects resolved
//    from origin_channel_id/channel_ids)

// TODO: define CustomersSortColumn
//  - "name" | "date_created" - the two sortable columns in the UI

// TODO: define CustomersQuery
//  - { name, email, date_created_min, date_created_max, sortColumn,
//    direction, page, limit } - no origin-channel filter, since
//    BigCommerce's v3 endpoint doesn't support filtering by
//    origin_channel_id
