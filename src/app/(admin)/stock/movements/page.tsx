import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { History } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StockNav } from "@/components/stock/stock-nav";
import { Card } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { listMovements, type MovementFilters } from "@/lib/api/stock";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import { MOVEMENT_TYPES, type MovementType } from "@/types";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n";

export const metadata = { title: "Stock history" };

const TYPE_LABELS: Record<MovementType, { label: MessageKey; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  sale: { label: "movement.sale", tone: "info" },
  sale_return: { label: "movement.sale_return", tone: "success" },
  stock_in: { label: "movement.stock_in", tone: "success" },
  adjustment: { label: "movement.adjustment", tone: "warning" },
  expired_writeoff: { label: "movement.expired_writeoff", tone: "danger" },
};

export default async function MovementsPage({ searchParams }: PageProps<"/stock/movements">) {
  const t = await getT();
  const params = await searchParams;
  const type = typeof params.type === "string" && MOVEMENT_TYPES.includes(params.type as MovementType) ? (params.type as MovementType) : undefined;
  const filters: MovementFilters = {
    variant_id: typeof params.variant === "string" ? Number(params.variant) || undefined : undefined,
    type,
    from: typeof params.from === "string" ? params.from : undefined,
    to: typeof params.to === "string" ? params.to : undefined,
    page: typeof params.page === "string" ? Number(params.page) || 1 : 1,
  };

  return (
    <>
      <PageHeader title={t("movements.title")} description={t("movements.description")} />
      <StockNav />

      <Form className="mb-4 flex flex-wrap gap-2" action="/stock/movements">
        {filters.variant_id && <input type="hidden" name="variant" value={filters.variant_id} />}
        <select name="type" defaultValue={type ?? ""} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" aria-label={t("movements.type")}>
          <option value="">{t("movements.allTypes")}</option>
          {MOVEMENT_TYPES.map((mt) => (
            <option key={mt} value={mt}>{t(TYPE_LABELS[mt].label)}</option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={filters.from} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" aria-label={t("common.from")} />
        <input type="date" name="to" defaultValue={filters.to} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" aria-label={t("common.toDate")} />
        <button type="submit" className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background">{t("movements.filter")}</button>
        {filters.variant_id && (
          <Link href="/stock/movements" className="inline-flex h-10 items-center text-sm text-primary hover:underline">
            {t("movements.clearMedicine")}
          </Link>
        )}
      </Form>

      <Card>
        <Suspense key={JSON.stringify(filters)} fallback={<Skeleton />}>
          <MovementList filters={filters} />
        </Suspense>
      </Card>
    </>
  );
}

async function MovementList({ filters }: { filters: MovementFilters }) {
  const t = await getT();
  let result;
  try {
    result = await listMovements(filters);
  } catch (error) {
    return (
      <div className="p-5">
        <Alert tone="error">{error instanceof ApiError ? error.message : t("common.refresh")}</Alert>
      </div>
    );
  }

  if (result.data.length === 0) {
    return <EmptyState icon={History} title={t("movements.empty")} description={t("movements.emptyHint")} />;
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>{t("th.when")}</Th>
            <Th>{t("th.medicine")}</Th>
            <Th>{t("movements.what")}</Th>
            <Th className="text-right">{t("movements.change")}</Th>
            <Th className="hidden text-right sm:table-cell">{t("movements.after")}</Th>
            <Th className="hidden md:table-cell">{t("movements.batchNote")}</Th>
          </tr>
        </thead>
        <tbody>
          {result.data.map((m) => {
            const meta = TYPE_LABELS[m.type];
            return (
              <tr key={m.id}>
                <Td className="whitespace-nowrap text-muted">{formatDateTime(m.createdAt)}</Td>
                <Td>
                  <Link href={`/catalogue/${m.variantId}`} className="font-medium hover:underline">
                    {m.variant.product.brandName}
                    {m.variant.strength ? ` ${m.variant.strength}` : ""}
                  </Link>
                  <p className="text-xs text-muted">{m.variant.dosageForm}</p>
                </Td>
                <Td>
                  <Badge tone={meta.tone}>{t(meta.label)}</Badge>
                  {m.referenceType === "sale" && m.referenceId && (
                    <Link href={`/sales/${m.referenceId}`} className="ml-2 text-xs text-primary hover:underline">{t("movements.sale")}</Link>
                  )}
                  {m.referenceType === "receipt" && m.referenceId && (
                    <Link href={`/stock/receipts/${m.referenceId}`} className="ml-2 text-xs text-primary hover:underline">{t("deliveries.receipt")}</Link>
                  )}
                </Td>
                <Td className={`text-right font-medium tabular-nums ${m.quantity < 0 ? "text-danger" : "text-success"}`}>
                  {m.quantity > 0 ? "+" : ""}
                  {m.quantity.toLocaleString()} <span className="text-xs font-normal text-muted">{m.variant.baseUnit}</span>
                </Td>
                <Td className="hidden text-right tabular-nums text-muted sm:table-cell">{m.newStock.toLocaleString()}</Td>
                <Td className="hidden max-w-[16rem] truncate text-xs text-muted md:table-cell">
                  {m.batch?.batchNo && <span className="font-mono">{m.batch.batchNo} · </span>}
                  {m.note ?? ""}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <div className="p-4">
        <Pagination
          meta={result.meta}
          basePath="/stock/movements"
          params={{
            variant: filters.variant_id ? String(filters.variant_id) : undefined,
            type: filters.type,
            from: filters.from,
            to: filters.to,
          }}
        />
      </div>
    </>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-background" />
      ))}
    </div>
  );
}
