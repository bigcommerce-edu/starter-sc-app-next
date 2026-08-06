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

// TODO: Implement toEndOfDayTimestamp

// TODO: ImplementfetchCustomers
//  - API fetch of customers list, various filters

// TODO: Implement fetchCustomer
//  - API fetch of a single customer by id

// TODO: Implement addToCustomerStoreCredit
//  - API mutation to add store credit to a customer