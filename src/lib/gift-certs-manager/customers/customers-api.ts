// TODO: Define CustomersResult interface
//  - Includes `items` array

// TODO: Define CustomersListResult interface
//  - Includes `items` and `totalItems` count

// TODO: Define CustomerWireRecord interface (the raw API shape)
//  - Replace channel_ids with an array of numbers OR null
//  - Replace store_credit_amounts with an array of objects with `amount` number

// TODO: Implement parseCustomer
//  - Parse a CustomerWireRecord into a Customer

// TODO: Implement fetchCustomersByEmail
//  - API fetch of customers list, filtered by email

// TODO: Constant for SORT_FIELD
//  - Maps the UI's sort columns to the fields the v3 customers endpoint
//    actually accepts (first_name, last_name, date_created) - there is no
//    "name" field on the wire
//  - Sort the Name column on first_name, matching how that column renders
//    ("{first_name} {last_name}"), so the order agrees with the column the
//    user clicked

// TODO: Implement toEndOfDayTimestamp

// TODO: ImplementfetchCustomers
//  - API fetch of customers list, various filters

// TODO: Implement fetchCustomer
//  - API fetch of a single customer by id

// TODO: Implement addToCustomerStoreCredit
//  - API mutation to add store credit to a customer