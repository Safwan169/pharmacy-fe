import { requireOwner } from "@/lib/current-user";
import Link from "next/link";
import { Suspense } from "react";
import { Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StockNav } from "@/components/stock/stock-nav";
import { SupplierEditToggle, SupplierForm } from "@/components/stock/supplier-form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { listSuppliers } from "@/lib/api/stock";
import { ApiError } from "@/lib/api/client";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage({ searchParams }: PageProps<"/suppliers">) {
  await requireOwner();
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const status = typeof params.status === "string" ? params.status : "active";
  const page = typeof params.page === "string" ? Number(params.page) || 1 : 1;

  return (
    <>
      <PageHeader title="Suppliers" description="Who the shop buys from. Pick one when receiving a delivery." />
      <StockNav />

      <Card className="mb-5">
        <CardHeader title="Add a supplier" />
        <CardBody>
          <SupplierForm />
        </CardBody>
      </Card>

      <form className="mb-4 flex flex-wrap gap-2" action="/suppliers">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Name or phone"
          className="h-10 min-w-56 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
          aria-label="Search suppliers"
        />
        <select name="status" defaultValue={status} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" aria-label="Status">
          <option value="active">In use</option>
          <option value="inactive">Not used any more</option>
          <option value="all">All</option>
        </select>
        <button type="submit" className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background">Search</button>
      </form>

      <Card>
        <Suspense key={`${search}-${status}-${page}`} fallback={<div className="h-40 animate-pulse" />}>
          <SupplierList search={search} status={status} page={page} />
        </Suspense>
      </Card>
    </>
  );
}

async function SupplierList({ search, status, page }: { search?: string; status: string; page: number }) {
  let result;
  try {
    result = await listSuppliers({ search, status, page });
  } catch (error) {
    return (
      <div className="p-5">
        <Alert tone="error">{error instanceof ApiError ? error.message : "Please refresh to try again."}</Alert>
      </div>
    );
  }

  if (result.data.length === 0) {
    return <EmptyState icon={Truck} title="No suppliers yet" description="Add the companies and distributors you buy from above." />;
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>Supplier</Th>
            <Th className="hidden sm:table-cell">Phone</Th>
            <Th className="hidden md:table-cell">Address</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {result.data.map((s) => (
            <tr key={s.id} className="align-top">
              <Td>
                <p className="font-medium">{s.name}</p>
                <Link href={`/stock/receipts?search=&supplier_id=${s.id}`} className="text-xs text-primary hover:underline">
                  Deliveries
                </Link>
                {" · "}
                <Link href={`/stock/receive?supplier=${s.id}`} className="text-xs text-primary hover:underline">
                  Receive from them
                </Link>
              </Td>
              <Td className="hidden text-muted sm:table-cell">{s.phone ?? "—"}</Td>
              <Td className="hidden max-w-[16rem] truncate text-muted md:table-cell">{s.address ?? "—"}</Td>
              <Td>{s.isActive ? <Badge tone="success">In use</Badge> : <Badge tone="neutral">Not used</Badge>}</Td>
              <Td className="text-right">
                <SupplierEditToggle supplier={s} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="p-4">
        <Pagination meta={result.meta} basePath="/suppliers" params={{ search, status }} />
      </div>
    </>
  );
}
