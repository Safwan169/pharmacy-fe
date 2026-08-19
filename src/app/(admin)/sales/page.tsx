import Link from "next/link";
import { Suspense } from "react";
import { Download, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SalesFilters } from "@/components/sales/sales-filters";
import { listSales } from "@/lib/api/sales";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Sales" };

export default async function SalesPage({ searchParams }: PageProps<"/sales">) {
  const params = await searchParams;
  const filters = readFilters(params);

  return (
    <>
      <PageHeader
        title="Sales"
        description="Every sale made, newest first. Search by invoice number or narrow it down to a date range."
      />

      <Suspense fallback={<div className="mb-4 h-24 animate-pulse rounded-lg bg-surface" />}>
        <SalesFilters />
      </Suspense>

      <Card>
        <Suspense key={JSON.stringify(filters)} fallback={<TableSkeleton />}>
          <SalesList filters={filters} params={params} />
        </Suspense>
      </Card>
    </>
  );
}

async function SalesList({
  filters,
  params,
}: {
  filters: ReturnType<typeof readFilters>;
  params: Awaited<PageProps<"/sales">["searchParams"]>;
}) {
  let result;
  try {
    result = await listSales(filters);
  } catch (error) {
    return (
      <div className="p-5">
        <Alert tone="error" title="We couldn't load the sales list">
          {error instanceof ApiError
            ? error.message
            : "Please refresh the page to try again."}
        </Alert>
      </div>
    );
  }

  const filtered = Boolean(filters.search || filters.from || filters.to);

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title={filtered ? "No sales match your search" : "No sales yet"}
        description={
          filtered
            ? "Try a different invoice number, or widen the dates."
            : "Once you take payment at the counter, every sale will be listed here with its invoice."
        }
      />
    );
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Invoice</Th>
            <Th>When</Th>
            <Th className="hidden text-right sm:table-cell">Before discount</Th>
            <Th className="hidden text-right sm:table-cell">Discount</Th>
            <Th className="text-right">Paid</Th>
            <Th><span className="sr-only">Actions</span></Th>
          </tr>
        </thead>
        <tbody>
          {result.data.map((sale) => (
            <tr key={sale.id} className="hover:bg-background/60">
              <Td>
                <Link
                  href={`/sales/${sale.id}`}
                  className="font-mono text-sm font-medium text-primary hover:underline"
                >
                  {sale.invoiceNumber}
                </Link>
              </Td>
              <Td className="text-muted">{formatDateTime(sale.createdAt)}</Td>
              <Td className="hidden text-right tabular-nums text-muted sm:table-cell">
                {formatCurrency(sale.subtotal)}
              </Td>
              <Td className="hidden text-right tabular-nums sm:table-cell">
                {sale.discountAmount > 0 ? (
                  <span className="text-success">
                    −{formatCurrency(sale.discountAmount)}
                  </span>
                ) : (
                  <span className="text-muted">None</span>
                )}
              </Td>
              <Td className="text-right font-semibold tabular-nums">
                {formatCurrency(sale.totalAmount)}
              </Td>
              <Td className="text-right">
                <a
                  href={`/api/invoices/${sale.id}`}
                  aria-label={`Download invoice ${sale.invoiceNumber}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">Invoice</span>
                </a>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination meta={result.meta} basePath="/sales" params={toStringParams(params)} />
    </>
  );
}

function readFilters(params: Record<string, string | string[] | undefined>) {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value !== "" ? value : undefined;
  };
  const page = Number(one("page"));

  return {
    search: one("search"),
    from: one("from"),
    to: one("to"),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: 20,
  };
}

function toStringParams(params: Record<string, string | string[] | undefined>) {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === "page") continue;
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-11 animate-pulse rounded-lg bg-background" />
      ))}
    </div>
  );
}
