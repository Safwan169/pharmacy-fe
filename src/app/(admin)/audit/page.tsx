import Link from "next/link";
import { History } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsNav } from "@/components/reports/reports-nav";
import { Card } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { listAudit } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { requireOwner } from "@/lib/current-user";
import { formatDateTime } from "@/lib/utils";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n";

export const metadata = { title: "Activity log" };

const ACTION_KEYS: Record<string, MessageKey> = {
  "price.update": "audit.action.price",
  "price.bulk": "audit.action.bulk",
  "stock.adjust": "audit.action.stock",
  "reorder.update": "audit.action.reorder",
  "variant.withdraw": "audit.action.withdraw",
  "variant.restore": "audit.action.restore",
  "user.create": "audit.action.userCreate",
  "user.update": "audit.action.userUpdate",
  "user.password_reset": "audit.action.passwordReset",
  "settings.update": "audit.action.settings",
};

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  await requireOwner();
  const t = await getT();
  const params = await searchParams;
  const page = typeof params.page === "string" ? Number(params.page) || 1 : 1;
  const entityType = typeof params.type === "string" ? params.type : undefined;

  let result;
  try {
    result = await listAudit({ entity_type: entityType, page, limit: 30 });
  } catch (error) {
    return <Alert tone="error">{error instanceof ApiError ? error.message : t("common.refresh")}</Alert>;
  }

  return (
    <>
      <PageHeader title={t("audit.title")} description={t("audit.description")} />
      <ReportsNav />
      <Card>
        {result.data.length === 0 ? (
          <EmptyState icon={History} title={t("audit.empty")} description={t("audit.emptyHint")} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("th.when")}</Th>
                <Th>{t("audit.who")}</Th>
                <Th>{t("audit.what")}</Th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((e) => (
                <tr key={e.id} className="align-top">
                  <Td className="whitespace-nowrap text-muted">{formatDateTime(e.createdAt)}</Td>
                  <Td className="whitespace-nowrap">{e.user?.name || e.user?.email || "—"}</Td>
                  <Td>
                    <Badge tone="neutral" className="mr-2">{ACTION_KEYS[e.action] ? t(ACTION_KEYS[e.action]) : e.action}</Badge>
                    {e.entityType === "variant" && e.entityId ? (
                      <Link href={`/catalogue/${e.entityId}`} className="hover:underline">{e.summary}</Link>
                    ) : (
                      e.summary
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <div className="p-4">
          <Pagination meta={result.meta} basePath="/audit" params={{ type: entityType }} />
        </div>
      </Card>
    </>
  );
}
