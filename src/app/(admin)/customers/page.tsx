import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { Contact } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerEditToggle, CustomerForm } from "@/components/customers/customer-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { LinkButton } from "@/components/ui/link-button";
import { listCustomers } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/utils";
import { getT } from "@/i18n/server";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const t = await getT();
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const hasDue = params.has_due === "1";
  const page = typeof params.page === "string" ? Number(params.page) || 1 : 1;

  return (
    <>
      <PageHeader
        title={t("customers.title")}
        description={t("customers.description")}
        action={<LinkButton href="/customers/due" variant="secondary">{t("customers.whoOwes")}</LinkButton>}
      />

      <Card className="mb-5">
        <CardHeader title={t("customers.add")} />
        <CardBody>
          <CustomerForm />
        </CardBody>
      </Card>

      <Form className="mb-4 flex flex-wrap gap-2" action="/customers">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder={t("suppliers.searchPlaceholder")}
          className="h-10 min-w-56 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
          aria-label={t("customers.searchLabel")}
        />
        <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm">
          <input type="checkbox" name="has_due" value="1" defaultChecked={hasDue} />
          {t("customers.owesMoney")}
        </label>
        <button type="submit" className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background">{t("common.search")}</button>
      </Form>

      <Card>
        <Suspense key={`${search}-${hasDue}-${page}`} fallback={<div className="h-40 animate-pulse" />}>
          <CustomerList search={search} hasDue={hasDue} page={page} />
        </Suspense>
      </Card>
    </>
  );
}

async function CustomerList({ search, hasDue, page }: { search?: string; hasDue: boolean; page: number }) {
  const t = await getT();
  let result;
  try {
    result = await listCustomers({ search, has_due: hasDue || undefined, page });
  } catch (error) {
    return (
      <div className="p-5">
        <Alert tone="error">{error instanceof ApiError ? error.message : t("common.refresh")}</Alert>
      </div>
    );
  }
  if (result.data.length === 0) {
    return <EmptyState icon={Contact} title={t("customers.empty")} description={t("customers.emptyHint")} />;
  }
  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>{t("receipt.customer")}</Th>
            <Th className="hidden sm:table-cell">{t("th.phone")}</Th>
            <Th className="text-right">{t("customers.owes")}</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {result.data.map((c) => (
            <tr key={c.id} className="align-top">
              <Td>
                <Link href={`/customers/${c.id}`} className="font-medium text-primary hover:underline">{c.name}</Link>
                {c.address && <p className="text-xs text-muted">{c.address}</p>}
              </Td>
              <Td className="hidden text-muted sm:table-cell">{c.phone ?? "—"}</Td>
              <Td className="text-right">
                {c.dueBalance > 0 ? <Badge tone="warning">{formatCurrency(c.dueBalance)}</Badge> : <span className="text-muted">—</span>}
              </Td>
              <Td className="text-right">
                <CustomerEditToggle customer={c} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="p-4">
        <Pagination meta={result.meta} basePath="/customers" params={{ search, has_due: hasDue ? "1" : undefined }} />
      </div>
    </>
  );
}
