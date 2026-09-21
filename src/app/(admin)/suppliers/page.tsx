import { requireOwner } from "@/lib/current-user";
import Link from "next/link";
import Form from "next/form";
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
import { LinkButton } from "@/components/ui/link-button";
import { formatCurrency } from "@/lib/utils";
import { getT } from "@/i18n/server";

export const metadata = { title: "Suppliers" };

export default async function SuppliersPage({ searchParams }: PageProps<"/suppliers">) {
  await requireOwner();
  const t = await getT();
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const status = typeof params.status === "string" ? params.status : "active";
  const page = typeof params.page === "string" ? Number(params.page) || 1 : 1;

  return (
    <>
      <PageHeader
        title={t("suppliers.title")}
        description={t("suppliers.description")}
        action={<LinkButton href="/suppliers/due" variant="secondary">{t("supplierDue.title")}</LinkButton>}
      />
      <StockNav />

      <Card className="mb-5">
        <CardHeader title={t("suppliers.add")} />
        <CardBody>
          <SupplierForm />
        </CardBody>
      </Card>

      <Form className="mb-4 flex flex-wrap gap-2" action="/suppliers">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder={t("suppliers.searchPlaceholder")}
          className="h-10 min-w-56 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
          aria-label={t("suppliers.searchLabel")}
        />
        <select name="status" defaultValue={status} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" aria-label={t("th.status")}>
          <option value="active">{t("suppliers.inUse")}</option>
          <option value="inactive">{t("suppliers.notUsedAnyMore")}</option>
          <option value="all">{t("common.all")}</option>
        </select>
        <button type="submit" className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background">{t("common.search")}</button>
      </Form>

      <Card>
        <Suspense key={`${search}-${status}-${page}`} fallback={<div className="h-40 animate-pulse" />}>
          <SupplierList search={search} status={status} page={page} />
        </Suspense>
      </Card>
    </>
  );
}

async function SupplierList({ search, status, page }: { search?: string; status: string; page: number }) {
  const t = await getT();
  let result;
  try {
    result = await listSuppliers({ search, status, page });
  } catch (error) {
    return (
      <div className="p-5">
        <Alert tone="error">{error instanceof ApiError ? error.message : t("common.refresh")}</Alert>
      </div>
    );
  }

  if (result.data.length === 0) {
    return <EmptyState icon={Truck} title={t("suppliers.empty")} description={t("suppliers.emptyHint")} />;
  }

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>{t("deliveries.supplier")}</Th>
            <Th className="hidden sm:table-cell">{t("th.phone")}</Th>
            <Th className="hidden md:table-cell">{t("th.address")}</Th>
            <Th className="text-right">{t("supplierDue.weOwe")}</Th>
            <Th>{t("th.status")}</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {result.data.map((s) => (
            <tr key={s.id} className="align-top">
              <Td>
                <Link href={`/suppliers/${s.id}`} className="font-medium text-primary hover:underline">{s.name}</Link>
                <Link href={`/stock/receipts?search=&supplier_id=${s.id}`} className="text-xs text-primary hover:underline">
                  {t("stockNav.deliveries")}
                </Link>
                {" · "}
                <Link href={`/stock/receive?supplier=${s.id}`} className="text-xs text-primary hover:underline">
                  {t("suppliers.receiveFrom")}
                </Link>
              </Td>
              <Td className="hidden text-muted sm:table-cell">{s.phone ?? "—"}</Td>
              <Td className="hidden max-w-[16rem] truncate text-muted md:table-cell">{s.address ?? "—"}</Td>
              <Td className="text-right tabular-nums">
                {s.dueBalance > 0 ? <Badge tone="warning">{formatCurrency(s.dueBalance)}</Badge> : <span className="text-muted">—</span>}
              </Td>
              <Td>{s.isActive ? <Badge tone="success">{t("suppliers.inUse")}</Badge> : <Badge tone="neutral">{t("suppliers.notUsed")}</Badge>}</Td>
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
