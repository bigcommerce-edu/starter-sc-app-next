import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { Panel } from "@/components/ui/panel";
import { Small, Text } from "@/components/ui/text";
import { AppLink } from "@/components/ui/app-link";
import { Customer, sumStoreCredit } from "@/lib/gift-certs-manager/customers/types";
import { getAppUrl } from "@/lib/routing/app-url";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box marginBottom="medium">
      <Small marginBottom="none">{label}</Small>
      <Text marginBottom="none">{children}</Text>
    </Box>
  );
}

interface GiftCertificatePartyPanelProps {
  header: string;
  name: string;
  email: string;
  account: Customer | undefined;
  // Only the recipient panel links to the account and shows store credit —
  // the sender isn't a link target anywhere else in this app, so there's no
  // customer detail page context to link to for them.
  isRecipient?: boolean;
  storeHash?: string;
}

export function GiftCertificatePartyPanel({
  header,
  name,
  email,
  account,
  isRecipient = false,
  storeHash,
}: GiftCertificatePartyPanelProps) {
  const accountUrl = isRecipient && account ? getAppUrl(storeHash, `/customers/${account.id}`) : undefined;

  return (
    <Panel header={header}>
      <DetailField label="Name on Certificate">{name}</DetailField>
      <DetailField label="Registered Customer">
        <Badge label={account ? "Yes" : "No"} variant={account ? "success" : "secondary"} />
      </DetailField>
      <DetailField label="Email">{accountUrl ? <AppLink href={accountUrl}>{email}</AppLink> : email}</DetailField>
      {account && (
        <DetailField label="Account Name">
          {accountUrl ? (
            <AppLink href={accountUrl}>{`${account.first_name} ${account.last_name}`}</AppLink>
          ) : (
            `${account.first_name} ${account.last_name}`
          )}
        </DetailField>
      )}
      {isRecipient && account && (
        <DetailField label="Store Credit Balance">
          {currencyFormatter.format(sumStoreCredit(account.store_credit_amounts))}
        </DetailField>
      )}
    </Panel>
  );
}
