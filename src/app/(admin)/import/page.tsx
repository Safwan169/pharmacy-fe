import { Download } from "lucide-react";
import { requireOwner } from "@/lib/current-user";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { ImportForm } from "@/components/import/import-form";
import { getT } from "@/i18n/server";

export const metadata = { title: "Import" };

const COLUMNS = [
  { name: "brand name", key: "import.col.brandName", required: true },
  { name: "type", key: "import.col.type", required: true },
  { name: "dosage form", key: "import.col.dosageForm", required: true },
  { name: "generic", key: "import.col.generic", required: false },
  { name: "strength", key: "import.col.strength", required: false },
  { name: "manufacturer", key: "import.col.manufacturer", required: true },
  { name: "mrp", key: "import.col.mrp", required: false },
  { name: "Package Size", key: "import.col.pack", required: false },
] as const;

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
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title={t("import.upload")}
              description={t("import.uploadHint")}
            />
            <CardBody>
              <ImportForm />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t("import.formatTitle")} description={t("import.formatBody")} />
            <CardBody className="space-y-4">
              <a
                href="/import-template.csv"
                download
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                <Download className="h-4 w-4" aria-hidden />
                {t("import.downloadTemplate")}
              </a>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
                <li>{t("import.step1")}</li>
                <li>{t("import.step2")}</li>
                <li>{t("import.step3")}</li>
              </ol>
              <dl className="divide-y divide-border text-sm">
                {COLUMNS.map((c) => (
                  <div key={c.name} className="grid gap-1 py-2 sm:grid-cols-[220px_1fr] sm:gap-4">
                    <dt className="font-mono text-xs font-medium sm:pt-0.5">
                      {c.name}
                      {c.required && <span className="ml-1 text-danger" title={t("common.required")}>*</span>}
                    </dt>
                    <dd className="text-muted">{t(c.key)}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-muted">{t("import.skippedWhen")}</p>
            </CardBody>
          </Card>
        </div>

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
