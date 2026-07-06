import { Panel, Text } from "@/components/ui/big-design";

export function GiftCertificateDetailView({ id }: { id: string }) {
  return (
    <Panel header="Gift Certificate">
      <Text marginBottom="none">Gift certificate ID: {id}</Text>
    </Panel>
  );
}
