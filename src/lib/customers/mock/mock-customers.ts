import { Customer } from "@/lib/customers/types";

// Registered customer accounts for the emails that mock-gift-certificates.ts
// marks as belonging to a registered customer. Account names occasionally
// differ from the name entered on the certificate (e.g. a middle initial) to
// demonstrate that the two are independent.
export const mockCustomers: Customer[] = [
  { id: 1, firstName: "Noah", lastName: "Thompson", email: "noah.thompson@example.com", originChannelId: 1, channelIds: [1], storeCreditBalance: 0 },
  { id: 2, firstName: "Liam", lastName: "Carter", email: "liam.carter@example.com", originChannelId: 1, channelIds: [1, 2], storeCreditBalance: 25 },
  { id: 3, firstName: "Mason", lastName: "Bennett", email: "mason.bennett@example.com", originChannelId: 2, channelIds: [2], storeCreditBalance: 0 },
  { id: 4, firstName: "Olivia B.", lastName: "Bennett", email: "olivia.bennett@example.com", originChannelId: 1, channelIds: [1], storeCreditBalance: 15.5 },
  { id: 5, firstName: "Lucas", lastName: "Nguyen", email: "lucas.nguyen@example.com", originChannelId: 1, channelIds: [1, 3], storeCreditBalance: 0 },
  { id: 6, firstName: "William", lastName: "Foster", email: "william.foster@example.com", originChannelId: 3, channelIds: [3], storeCreditBalance: 50 },
  { id: 7, firstName: "Daniel", lastName: "Martinez", email: "daniel.martinez@example.com", originChannelId: 1, channelIds: [1], storeCreditBalance: 0 },
  { id: 8, firstName: "Sophia", lastName: "Martinez", email: "sophia.martinez@example.com", originChannelId: 2, channelIds: [1, 2], storeCreditBalance: 10 },
  { id: 9, firstName: "Henry", lastName: "Cruz", email: "henry.cruz@example.com", originChannelId: 1, channelIds: [1], storeCreditBalance: 0 },
  { id: 10, firstName: "Isabella", lastName: "Cruz", email: "isabella.cruz@example.com", originChannelId: 1, channelIds: [1], storeCreditBalance: 5.25 },
  { id: 11, firstName: "Jack", lastName: "Sullivan", email: "jack.sullivan@example.com", originChannelId: 3, channelIds: [2, 3], storeCreditBalance: 0 },
  { id: 12, firstName: "Mia R.", lastName: "Sullivan", email: "mia.sullivan@example.com", originChannelId: 1, channelIds: [1], storeCreditBalance: 30 },
];
