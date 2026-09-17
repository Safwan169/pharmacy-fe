import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Pill } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PricingForm } from "@/components/catalogue/pricing-form";
import { AvailabilityControl } from "@/components/catalogue/availability-control";
import { BatchTable } from "@/components/catalogue/batch-table";
import { SellableBadge, PriceCell, StockCell } from "@/components/catalogue/status-badges";
import { getUnitTemplate, getVariant, listGenericVariants } from "@/lib/api/catalogue";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/catalogue/[id]">) {
  const { id } = await params;
  try {
    const variant = await getVariant(Number(id));
    return { title: variant.product.brandName };
  } catch {
    return { title: "Medicine" };
  }
}

export default async function VariantDetailPage({
  params,
}: PageProps<"/catalogue/[id]">) {
  const { id } = await params;
  const variantId = Number(id);

  if (!Number.isInteger(variantId) || variantId < 1) notFound();

  let variant;
  try {
    variant = await getVariant(variantId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const name = `${variant.product.brandName}${variant.strength ? ` ${variant.strength}` : ""}`;

  // A SKU that has never been set up gets a suggested ladder to start from.
  let template = null;
  if ((variant.units ?? []).length === 0) {
    try {
      template = await getUnitTemplate({
        dosage_form: variant.dosageForm,
        pack_size: variant.packSize,
      });
    } catch {
      template = null;
    }
  }

  return (
    <>
      <Link
        href="/catalogue"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to catalogue
      </Link>

      <PageHeader
        title={name}
        description={`${variant.dosageForm} · ${variant.product.manufacturer?.name ?? "Unknown company"}`}
        action={
          <SellableBadge
            isActive={variant.isActive}
            price={variant.price}
            stock={variant.stockQuantity}
          />
        }
      />

      {!variant.isActive && (
        <Alert tone="warning" title="This medicine is withdrawn from sale" className="mb-5">
          It won&apos;t show up in the catalogue or at the counter, and it can&apos;t
          be sold. Everything about it has been kept — put it back on sale below
          whenever you need it.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Detail label="Brand" value={variant.product.brandName} />
              <Detail label="Form" value={variant.dosageForm} />
              <Detail label="Strength" value={variant.strength ?? "Not recorded"} />
              <Detail
                label="Active ingredient"
                value={variant.generic?.name ?? "Not recorded"}
              />
              <Detail
                label="Company"
                value={variant.product.manufacturer?.name ?? "Not recorded"}
              />
              <Detail
                label="Kind"
                value={variant.product.type === "herbal" ? "Herbal" : "Allopathic"}
              />
              <Detail
                label="Price last changed"
                value={
                  variant.priceUpdatedAt
                    ? formatDateTime(variant.priceUpdatedAt)
                    : "Never — this has not been priced yet"
                }
              />
              <Detail label="Reference number" value={`#${variant.id}`} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Batches on the shelf"
              description="Where the stock came from and when each lot expires. The counter sells the soonest-expiring batch first."
              action={
                <span className="flex gap-3 text-xs font-medium">
                  <Link href={`/stock/receive`} className="text-primary hover:underline">
                    Receive stock
                  </Link>
                  <Link href={`/stock/movements?variant=${variant.id}`} className="text-primary hover:underline">
                    History
                  </Link>
                </span>
              }
            />
            <BatchTable
              variantId={variant.id}
              baseUnit={variant.baseUnit}
              batches={variant.batches ?? []}
            />
          </Card>

          {variant.genericId && (
            <Suspense fallback={<AlternativesSkeleton />}>
              <Alternatives
                genericId={variant.genericId}
                currentId={variant.id}
                genericName={variant.generic?.name ?? "this ingredient"}
              />
            </Suspense>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="How it's sold, price and stock"
              description="Which units the counter can sell, what each costs, and how many you have."
            />
            <CardBody>
              <PricingForm
                variantId={variant.id}
                baseUnit={variant.baseUnit}
                units={variant.units ?? []}
                template={template}
                stock={variant.stockQuantity}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Availability"
              description="Stop selling this without losing any of its history."
            />
            <CardBody>
              <AvailabilityControl
                variantId={variant.id}
                isActive={variant.isActive}
                name={name}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Other brands built on the same active ingredient — what to offer if this one is out. */
async function Alternatives({
  genericId,
  currentId,
  genericName,
}: {
  genericId: number;
  currentId: number;
  genericName: string;
}) {
  let result;
  try {
    result = await listGenericVariants(genericId, { limit: 10 });
  } catch {
    return null;
  }

  const others = result.data.filter((v) => v.id !== currentId);

  return (
    <Card>
      <CardHeader
        title="Other brands with the same ingredient"
        description={`Alternatives containing ${genericName} — useful when this one is out of stock.`}
      />
      {others.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No alternatives stocked"
          description="This is the only brand in the catalogue built on this ingredient."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Medicine</Th>
              <Th className="hidden sm:table-cell">Company</Th>
              <Th className="text-right">Price</Th>
              <Th className="text-right">In stock</Th>
            </tr>
          </thead>
          <tbody>
            {others.map((alt) => (
              <tr key={alt.id} className="hover:bg-background/60">
                <Td>
                  <Link
                    href={`/catalogue/${alt.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {alt.product.brandName}
                    {alt.strength ? ` ${alt.strength}` : ""}
                  </Link>
                  <p className="text-xs text-muted">{alt.dosageForm}</p>
                </Td>
                <Td className="hidden max-w-[12rem] truncate text-muted sm:table-cell">
                  {alt.product.manufacturer?.name ?? "—"}
                </Td>
                <Td className="text-right">
                  <PriceCell
                    price={alt.price}
                    unit={alt.units?.find((u) => u.isDefault)?.name}
                  />
                </Td>
                <Td className="text-right">
                  <StockCell stock={alt.stockQuantity} unit={alt.baseUnit} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function AlternativesSkeleton() {
  return (
    <Card>
      <CardHeader title="Other brands with the same ingredient" />
      <div className="space-y-3 p-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-background" />
        ))}
      </div>
    </Card>
  );
}
