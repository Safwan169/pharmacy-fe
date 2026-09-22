import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { BulkPriceForm } from "@/components/catalogue/bulk-price-form";
import { listAllGenerics, listAllManufacturers } from "@/lib/api/catalogue";
import { requireOwner } from "@/lib/current-user";
import { getT } from "@/i18n/server";

export const metadata = { title: "Bulk price change" };

export default async function BulkPricePage() {
  await requireOwner();
  const t = await getT();
  const [manufacturers, generics] = await Promise.all([
    listAllManufacturers(),
    listAllGenerics(),
  ]);
  return (
    <>
      <Link href="/catalogue" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("catalogue.back")}
      </Link>
      <PageHeader title={t("bulk.title")} description={t("bulk.description")} />
      <Card className="max-w-4xl">
        <CardBody>
          <BulkPriceForm manufacturers={manufacturers} generics={generics} />
        </CardBody>
      </Card>
    </>
  );
}
