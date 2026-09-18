import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { NewMedicineForm } from "@/components/catalogue/new-medicine-form";
import { listGenerics, listManufacturers } from "@/lib/api/catalogue";
import { requireOwner } from "@/lib/current-user";
import { getT } from "@/i18n/server";

export const metadata = { title: "Add a medicine" };

export default async function NewMedicinePage() {
  await requireOwner();
  const t = await getT();
  const [manufacturers, generics] = await Promise.all([
    listManufacturers({ limit: 100 }),
    listGenerics({ limit: 100 }),
  ]);

  return (
    <>
      <Link href="/catalogue" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("catalogue.back")}
      </Link>
      <PageHeader title={t("newMedicine.title")} description={t("newMedicine.description")} />
      <Card className="max-w-3xl">
        <CardBody>
          <NewMedicineForm manufacturers={manufacturers.data} generics={generics.data} />
        </CardBody>
      </Card>
    </>
  );
}
