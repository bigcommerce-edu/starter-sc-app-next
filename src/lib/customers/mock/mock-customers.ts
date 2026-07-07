import { Customer } from "@/lib/customers/types";

// Registered customer accounts for the emails that mock-gift-certificates.ts
// marks as belonging to a registered customer. Account names occasionally
// differ from the name entered on the certificate (e.g. a middle initial) to
// demonstrate that the two are independent.
export const mockCustomers: Customer[] = [
  { id: 1, firstName: "Noah", lastName: "Thompson", email: "noah.thompson@example.com" },
  { id: 2, firstName: "Liam", lastName: "Carter", email: "liam.carter@example.com" },
  { id: 3, firstName: "Mason", lastName: "Bennett", email: "mason.bennett@example.com" },
  { id: 4, firstName: "Olivia B.", lastName: "Bennett", email: "olivia.bennett@example.com" },
  { id: 5, firstName: "Lucas", lastName: "Nguyen", email: "lucas.nguyen@example.com" },
  { id: 6, firstName: "William", lastName: "Foster", email: "william.foster@example.com" },
  { id: 7, firstName: "Daniel", lastName: "Martinez", email: "daniel.martinez@example.com" },
  { id: 8, firstName: "Sophia", lastName: "Martinez", email: "sophia.martinez@example.com" },
  { id: 9, firstName: "Henry", lastName: "Cruz", email: "henry.cruz@example.com" },
  { id: 10, firstName: "Isabella", lastName: "Cruz", email: "isabella.cruz@example.com" },
  { id: 11, firstName: "Jack", lastName: "Sullivan", email: "jack.sullivan@example.com" },
  { id: 12, firstName: "Mia R.", lastName: "Sullivan", email: "mia.sullivan@example.com" },
];
