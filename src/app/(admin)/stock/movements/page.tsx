import Link from "next/link";
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

export const metadata = { title: "Stock history" };

const TYPE_LABELS: Record<MovementType, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
  sale: { label: "Sold", tone: "info" },
  sale_return: { label: "Returned", tone: "success" },
  stock_in: { label: "Received", tone: "success" },
  adjustment: { label: "Count corrected", tone: "warning" },
  expired_writeoff: { label: "Written off", tone: "danger" },
};

export default async function MovementsPage({ searchParams }: PageProps<"/stock/movements">) {
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
      <PageHeader title="Stock history" description="Every change to stock — sales, deliveries, corrections and write-offs — newest first." />
      <StockNav />

      <form className="mb-4 flex flex-wrap gap-2" action="/stock/movements">
        {filters.variant_id && <input type="hidden" name="variant" value={filters.variant_id} />}
        <select name="type" defaultValue={type ?? ""} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" aria-label="Type">
          <option value="">All types</option>
          {MOVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t].label}</option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={filters.from} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" aria-label="From" />
        <input type="date" name="to" defaultValue={filters.to} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" aria-label="To" />
        <button type="submit" className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background">Filter</button>
        {filters.variant_id && (
          <Link href="/stock/movements" className="inline-flex h-10 items-center text-sm text-primary hover:underline">
            Clear medicine filter
          </Link>
        )}
      </form>

      <Card>
        <Suspense key={JSON.stringify(filters)} fallback={<Skeleton />}>
          <MovementList filters={filters} />
        </Suspense>
      </Card>
    </>
  );
}

async function MovementList({ filters }: { filters: MovementFilters }) {
  let result;
  try {
    result = await listMovements(filters);
  } catch (error) {
    return (
      <div className="p-5">
        <Alert tone="error">{error instanceof ApiError ? error.message : "Please refresh to try again."}</Alert>
      </div>
    );
  }

  if (result.data.length === 0) {
    return <EmptyState icon={History} title="No stock movements" description="Nothing matches these filters." />;
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>When</Th>
            <Th>Medicine</Th>
            <Th>What</Th>
            <Th className="text-right">Change</Th>
            <Th className="hidden text-right sm:table-cell">After</Th>
            <Th className="hidden md:table-cell">Batch / note</Th>
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
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {m.referenceType === "sale" && m.referenceId && (
                    <Link href={`/sales/${m.referenceId}`} className="ml-2 text-xs text-primary hover:underline">Sale</Link>
                  )}
                  {m.referenceType === "receipt" && m.referenceId && (
                    <Link href={`/stock/receipts/${m.referenceId}`} className="ml-2 text-xs text-primary hover:underline">Receipt</Link>
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
