import { PageHeader } from "@/components/layout/page-header";
import { StockNav } from "@/components/stock/stock-nav";
import { ReceiveForm } from "@/components/stock/receive-form";
import { getT } from "@/i18n/server";

export const metadata = { title: "Receive stock" };

export default async function ReceivePage({ searchParams }: PageProps<"/stock/receive">) {
  const t = await getT();
  const params = await searchParams;
  const supplierId = typeof params.supplier === "string" ? Number(params.supplier) : undefined;

  return (
    <>
      <PageHeader
        title={t("receive.title")}
        description={t("receive.description")}
      />
      <StockNav />
      <ReceiveForm initialSupplierId={Number.isInteger(supplierId) && supplierId! > 0 ? supplierId : undefined} />
    </>
  );
}
