import { PageHeader } from "@/components/layout/page-header";
import { CounterTerminal } from "@/components/pos/counter-terminal";

export const metadata = { title: "Counter" };

export default function CounterPage() {
  return (
    <>
      <PageHeader
        title="Counter"
        description="Add what the customer is buying, then take payment. Nothing is charged until the whole basket goes through."
      />
      <CounterTerminal />
    </>
  );
}
