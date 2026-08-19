import { Suspense } from "react";
import { PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { VariantFilters } from "@/components/catalogue/variant-filters";
import { VariantTable } from "@/components/catalogue/variant-table";
import { listGenerics, listManufacturers, listVariants } from "@/lib/api/catalogue";
import { ApiError } from "@/lib/api/client";

export const metadata = { title: "Pricing" };

const FILTER_OPTIONS_LIMIT = 100;

/**
 * The pricing worklist — every SKU the import left without a price.
 *
 * The list shrinks as prices go in: once a medicine has a price it stops
 * appearing here and becomes sellable at the counter.
 */
export default async function PricingPage({ searchParams }: PageProps<"/pricing">) {
  const params = await searchParams;
  const filters = readFilters(params);

  return (
    <>
      <PageHeader
        title="Set prices and stock"
        description="Medicines still waiting for a price. Work through them one at a time — filter by company to do a whole shelf at once."
      />

      <Suspense fallback={<div className="mb-4 h-24 animate-pulse rounded-lg bg-surface" />}>
        <Filters />
      </Suspense>

      <Card>
        <Suspense key={JSON.stringify(filters)} fallback={<TableSkeleton />}>
          <Worklist filters={filters} params={params} />
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
    <VariantFilters
      manufacturers={manufacturers.data}
      generics={generics.data}
      // The worklist IS the "needs a price" filter, so offering it again would
      // let someone contradict the page they're on.
      showPricingStatus={false}
      showAvailability={false}
    />
  );
}

async function Worklist({
  filters,
  params,
}: {
  filters: ReturnType<typeof readFilters>;
  params: Awaited<PageProps<"/pricing">["searchParams"]>;
}) {
  let result;
  try {
    result = await listVariants(filters);
  } catch (error) {
    return (
      <div className="p-5">
        <Alert tone="error" title="We couldn't load the pricing list">
          {error instanceof ApiError
            ? error.message
            : "Please refresh the page to try again."}
        </Alert>
      </div>
    );
  }

  const remaining = result.meta.total;

  if (remaining === 0) {
    return (
      <>
        <CardHeader title="Nothing left to price" />
        <EmptyState
          icon={PackageCheck}
          title="Every medicine here has a price"
          description="Nothing matching these filters is waiting to be priced. Clear the filters to check the rest of the catalogue."
        />
      </>
    );
  }

  return (
    <>
      <CardHeader
        title="Waiting for a price"
        description="Open one to enter its price and how many you have."
        action={
          <Badge tone="warning">
            {remaining.toLocaleString()} to go
          </Badge>
        }
      />
      <VariantTable
        variants={result.data}
        emptyTitle="Nothing on this page"
        emptyDescription="Try going back to the first page."
      />
      <Pagination meta={result.meta} basePath="/pricing" params={toStringParams(params)} />
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
    type: one("type"),
    // This is what makes the page a worklist rather than a catalogue.
    pricing_status: "missing",
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
