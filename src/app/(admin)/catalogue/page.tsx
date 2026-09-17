import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Pagination } from "@/components/ui/pagination";
import { VariantFilters } from "@/components/catalogue/variant-filters";
import { VariantTable } from "@/components/catalogue/variant-table";
import { listGenerics, listManufacturers, listVariants } from "@/lib/api/catalogue";
import { ApiError } from "@/lib/api/client";
import { getT } from "@/i18n/server";

export const metadata = { title: "Catalogue" };

/** The dropdowns cap out at the API's maximum page size. */
const FILTER_OPTIONS_LIMIT = 100;

export default async function CataloguePage({ searchParams }: PageProps<"/catalogue">) {
  const t = await getT();
  const params = await searchParams;
  const filters = readFilters(params);

  return (
    <>
      <PageHeader
        title={t("catalogue.title")}
        description={t("catalogue.description")}
      />

      <Suspense fallback={<div className="mb-4 h-24 animate-pulse rounded-lg bg-surface" />}>
        <Filters />
      </Suspense>

      <Card>
        <Suspense key={JSON.stringify(filters)} fallback={<TableSkeleton />}>
          <Results filters={filters} params={params} />
        </Suspense>
      </Card>
    </>
  );
}

async function Filters() {
  const [manufacturers, generics] = await Promise.all([
    listManufacturers({ limit: FILTER_OPTIONS_LIMIT }),
    listGenerics({ limit: FILTER_OPTIONS_LIMIT }),
  ]);

  return (
    <VariantFilters manufacturers={manufacturers.data} generics={generics.data} />
  );
}

async function Results({
  filters,
  params,
}: {
  filters: ReturnType<typeof readFilters>;
  params: Awaited<PageProps<"/catalogue">["searchParams"]>;
}) {
  const t = await getT();
  let result;
  try {
    result = await listVariants(filters);
  } catch (error) {
    return (
      <div className="p-5">
        <Alert tone="error" title={t("catalogue.loadError")}>
          {error instanceof ApiError
            ? error.message
            : t("common.refresh")}
        </Alert>
      </div>
    );
  }

  const searching = Boolean(filters.search);

  return (
    <>
      <VariantTable
        variants={result.data}
        emptyTitle={searching ? t("catalogue.emptySearchTitle") : t("catalogue.emptyTitle")}
        emptyDescription={
          searching
            ? t("catalogue.emptySearchHint")
            : t("catalogue.emptyHint")
        }
      />
      <Pagination
        meta={result.meta}
        basePath="/catalogue"
        params={toStringParams(params)}
      />
    </>
  );
}

function readFilters(params: Record<string, string | string[] | undefined>) {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value !== "" ? value : undefined;
  };
  const num = (key: string) => {
    const value = one(key);
    const parsed = value ? Number(value) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  };

  return {
    search: one("search"),
    manufacturer_id: num("manufacturer_id"),
    generic_id: num("generic_id"),
    dosage_form: one("dosage_form"),
    type: one("type"),
    pricing_status: one("pricing_status"),
    status: one("status"),
    page: num("page") ?? 1,
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
