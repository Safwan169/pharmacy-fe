import { requireOwner } from "@/lib/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ImportForm } from "@/components/import/import-form";
import { getT } from "@/i18n/server";

export const metadata = { title: "Import" };

export default async function ImportPage() {
  await requireOwner();
  const t = await getT();
  return (
    <>
      <PageHeader
        title={t("import.title")}
        description={t("import.description")}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={t("import.upload")}
            description={t("import.uploadHint")}
          />
          <CardBody>
            <ImportForm />
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Alert tone="info" title={t("import.safeTitle")}>
            {t("import.safeBody")}
          </Alert>

          <Alert tone="warning" title={t("import.pricesTitle")}>
            {t("import.pricesBody")}
          </Alert>

          <Alert tone="info" title={t("import.largeTitle")}>
            {t("import.largeBody")}
          </Alert>
        </div>
      </div>
    </>
  );
}
