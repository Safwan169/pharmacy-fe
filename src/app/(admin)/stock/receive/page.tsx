import { PageHeader } from "@/components/layout/page-header";
import { StockNav } from "@/components/stock/stock-nav";
import { ReceiveForm } from "@/components/stock/receive-form";

export const metadata = { title: "Receive stock" };

export default async function ReceivePage({ searchParams }: PageProps<"/stock/receive">) {
  const params = await searchParams;
  const supplierId = typeof params.supplier === "string" ? Number(params.supplier) : undefined;

  return (
    <>
      <PageHeader
        title="Receive stock"
        description="Enter a delivery line by line. Each line becomes a batch with its own expiry date and cost."
      />
      <StockNav />
      <ReceiveForm initialSupplierId={Number.isInteger(supplierId) && supplierId! > 0 ? supplierId : undefined} />
    </>
  );
}
