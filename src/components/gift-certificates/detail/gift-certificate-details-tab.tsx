import { Flex, FlexItem } from "@/components/ui/big-design";
import { GiftCertificatePartyPanel } from "@/components/gift-certificates/detail/gift-certificate-party-panel";
import { GiftCertificateStatusPanel } from "@/components/gift-certificates/detail/gift-certificate-status-panel";
import { GiftCertificate } from "@/lib/gift-certificates/types";

export function GiftCertificateDetailsTab({ giftCertificate }: { giftCertificate: GiftCertificate }) {
  return (
    <Flex flexDirection="column" flexGap="1rem">
      <FlexItem>
        <GiftCertificateStatusPanel giftCertificate={giftCertificate} />
      </FlexItem>
      <FlexItem>
        <GiftCertificatePartyPanel
          header="Sender"
          name={giftCertificate.senderName}
          email={giftCertificate.senderEmail}
          hasAccount={giftCertificate.senderHasAccount}
          accountName={giftCertificate.senderAccountName}
        />
      </FlexItem>
      <FlexItem>
        <GiftCertificatePartyPanel
          header="Recipient"
          name={giftCertificate.recipientName}
          email={giftCertificate.recipientEmail}
          hasAccount={giftCertificate.recipientHasAccount}
          accountName={giftCertificate.recipientAccountName}
        />
      </FlexItem>
    </Flex>
  );
}
