import Link from "next/link";
import { Suspense } from "react";
import { PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StockNav } from "@/components/stock/stock-nav";
import { Card } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { LinkButton } from "@/components/ui/link-button";
import { listReceipts, type ReceiptFilters } from "@/lib/api/stock";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Deliveries" };

export default async function ReceiptsPage({ searchParams }: PageProps<"/stock/receipts">) {
  const params = await searchParams;
  const filters: ReceiptFilters = {
    search: typeof params.search === "string" ? params.search : undefined,
    supplier_id: typeof params.supplier_id === "string" ? Number(params.supplier_id) || undefined : undefined,
    from: typeof params.from === "string" ? params.from : undefined,
    to: typeof params.to === "string" ? params.to : undefined,
    page: typeof params.page === "string" ? Number(params.page) || 1 : 1,
  };

  return (
    <>
      <PageHeader
        title="Deliveries"
        description="Every delivery received, newest first."
        action={
          <LinkButton href="/stock/receive">
            <PackagePlus className="h-4 w-4" aria-hidden />
            Receive stock
          </LinkButton>
        }
      />
      <StockNav />

      <form className="mb-4 flex flex-wrap gap-2" action="/stock/receipts">
        {filters.supplier_id && <input type="hidden" name="supplier_id" value={filters.supplier_id} />}
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Receipt or supplier invoice no."
          className="h-10 min-w-56 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
          aria-label="Search deliveries"
        />
        <input type="date" name="from" defaultValue={filters.from} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" aria-label="From" />
        <input type="date" name="to" defaultValue={filters.to} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" aria-label="To" />
        <button type="submit" className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background">
          Search
        </button>
      </form>

      <Card>
        <Suspense key={JSON.stringify(filters)} fallback={<Skeleton />}>
          <ReceiptList filters={filters} />
        </Suspense>
      </Card>
    </>
  );
}

async function ReceiptList({ filters }: { filters: ReceiptFilters }) {
  let result;
  try {
    result = await listReceipts(filters);
  } catch (error) {
    return (
      <div className="p-5">
        <Alert tone="error">{error instanceof ApiError ? error.message : "Please refresh to try again."}</Alert>
      </div>
    );
  }

  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={PackagePlus}
        title="No deliveries yet"
        description="When stock arrives, record it under Receive so every batch gets an expiry date and cost."
      />
    );
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Receipt</Th>
            <Th>Date</Th>
            <Th className="hidden md:table-cell">Supplier</Th>
            <Th className="hidden sm:table-cell">Their invoice</Th>
            <Th className="text-right">Total cost</Th>
          </tr>
        </thead>
        <tbody>
          {result.data.map((r) => (
            <tr key={r.id} className="hover:bg-background/60">
              <Td>
                <Link href={`/stock/receipts/${r.id}`} className="font-mono text-sm font-medium text-primary hover:underline">
                  {r.receiptNumber}
                </Link>
              </Td>
              <Td className="text-muted">{formatDate(r.receivedAt)}</Td>
              <Td className="hidden md:table-cell">{r.supplier?.name ?? <span className="text-muted">—</span>}</Td>
              <Td className="hidden text-muted sm:table-cell">{r.supplierInvoiceNo ?? "—"}</Td>
              <Td className="text-right font-semibold tabular-nums">{formatCurrency(r.totalCost)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="p-4">
        <Pagination
          meta={result.meta}
          basePath="/stock/receipts"
          params={{
            search: filters.search,
            supplier_id: filters.supplier_id ? String(filters.supplier_id) : undefined,
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
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-background" />
      ))}
    </div>
  );
}
