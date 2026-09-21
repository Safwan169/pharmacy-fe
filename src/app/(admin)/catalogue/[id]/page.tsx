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
import { getCurrentUser } from "@/lib/current-user";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";
import { getT } from "@/i18n/server";
import { listAudit } from "@/lib/api/reports";

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
  searchParams,
}: PageProps<"/catalogue/[id]">) {
  const { id } = await params;
  const justCreated = (await searchParams).created === "1";
  const variantId = Number(id);
  const t = await getT();

  if (!Number.isInteger(variantId) || variantId < 1) notFound();

  let variant;
  try {
    variant = await getVariant(variantId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const name = `${variant.product.brandName}${variant.strength ? ` ${variant.strength}` : ""}`;
  const isOwner = (await getCurrentUser()).role === "owner";

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
        {t("catalogue.back")}
      </Link>

      <PageHeader
        title={name}
        description={`${variant.dosageForm} · ${variant.product.manufacturer?.name ?? t("catalogue.unknownCompany")}`}
        action={
          <SellableBadge
            isActive={variant.isActive}
            price={variant.price}
            stock={variant.stockQuantity}
          />
        }
      />

      {justCreated && (
        <Alert tone="success" title={t("newMedicine.createdTitle")} className="mb-5">
          {t("newMedicine.createdBody")}
        </Alert>
      )}

      {!variant.isActive && (
        <Alert tone="warning" title={t("catalogue.withdrawnTitle")} className="mb-5">
          {t("catalogue.withdrawnBody")}
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title={t("catalogue.details")} />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Detail label={t("catalogue.brand")} value={variant.product.brandName} />
              <Detail label={t("catalogue.form")} value={variant.dosageForm} />
              <Detail label={t("catalogue.strength")} value={variant.strength ?? t("catalogue.notRecorded")} />
              <Detail
                label={t("catalogue.activeIngredient")}
                value={variant.generic?.name ?? t("catalogue.notRecorded")}
              />
              <Detail
                label={t("th.company")}
                value={variant.product.manufacturer?.name ?? t("catalogue.notRecorded")}
              />
              <Detail
                label={t("filters.kind")}
                value={variant.product.type === "herbal" ? t("kind.herbal") : t("kind.allopathic")}
              />
              <Detail
                label={t("catalogue.priceChanged")}
                value={
                  variant.priceUpdatedAt
                    ? formatDateTime(variant.priceUpdatedAt)
                    : t("catalogue.neverPriced")
                }
              />
              <Detail
                label={t("pricing.reorderLabel")}
                value={variant.reorderLevel === null ? t("catalogue.reorderDefault") : `${variant.reorderLevel} ${variant.baseUnit}`}
              />
              <Detail label={t("catalogue.reference")} value={`#${variant.id}`} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={t("catalogue.batchesTitle")}
              description={t("catalogue.batchesHint")}
              action={
                isOwner ? (
                  <span className="flex gap-3 text-xs font-medium">
                    <Link href={`/stock/receive`} className="text-primary hover:underline">
                      {t("catalogue.receiveStock")}
                    </Link>
                    <Link href={`/stock/movements?variant=${variant.id}`} className="text-primary hover:underline">
                      {t("catalogue.history")}
                    </Link>
                  </span>
                ) : undefined
              }
            />
            <BatchTable
              variantId={variant.id}
              baseUnit={variant.baseUnit}
              batches={variant.batches ?? []}
              canWriteOff={isOwner}
            />
          </Card>

          {isOwner && (
            <Suspense fallback={null}>
              <ChangeHistory variantId={variant.id} />
            </Suspense>
          )}

          {variant.genericId && (
            <Suspense fallback={<AlternativesSkeleton />}>
              <Alternatives
                genericId={variant.genericId}
                currentId={variant.id}
                genericName={variant.generic?.name ?? t("catalogue.thisIngredient")}
              />
            </Suspense>
          )}
        </div>

        {isOwner && (
        <div className="space-y-5">
          <Card>
            <CardHeader
              title={t("catalogue.pricingTitle")}
              description={t("catalogue.pricingHint")}
            />
            <CardBody>
              <PricingForm
                variantId={variant.id}
                baseUnit={variant.baseUnit}
                units={variant.units ?? []}
                template={template}
                stock={variant.stockQuantity}
                reorderLevel={variant.reorderLevel}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={t("filters.availability")}
              description={t("catalogue.availabilityHint")}
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
        )}
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
  const t = await getT();
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
        title={t("catalogue.altTitle")}
        description={t("catalogue.altHint", { name: genericName })}
      />
      {others.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={t("catalogue.altEmpty")}
          description={t("catalogue.altEmptyHint")}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("th.medicine")}</Th>
              <Th className="hidden sm:table-cell">{t("th.company")}</Th>
              <Th className="text-right">{t("th.price")}</Th>
              <Th className="text-right">{t("th.inStock")}</Th>
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

/** The last few price, unit and stock changes to this medicine, and who made them. */
async function ChangeHistory({ variantId }: { variantId: number }) {
  const t = await getT();
  let entries;
  try {
    entries = (await listAudit({ entity_type: "variant", entity_id: variantId, limit: 8 })).data;
  } catch {
    return null;
  }
  if (entries.length === 0) return null;
  return (
    <Card>
      <CardHeader title={t("audit.historyTitle")} description={t("audit.historyHint")} />
      <ul className="divide-y divide-border text-sm">
        {entries.map((e) => (
          <li key={e.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-5 py-2.5">
            <span className="min-w-0 flex-1">{e.summary.replace(/^[^:]+: /, "")}</span>
            <span className="shrink-0 text-xs text-muted">
              {formatDateTime(e.createdAt)} · {e.user?.name || e.user?.email || "—"}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function AlternativesSkeleton() {
  const t = await getT();
  return (
    <Card>
      <CardHeader title={t("catalogue.altTitle")} />
      <div className="space-y-3 p-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-background" />
        ))}
      </div>
    </Card>
  );
}
