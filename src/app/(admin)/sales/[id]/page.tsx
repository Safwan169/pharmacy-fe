import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { getSale } from "@/lib/api/sales";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/sales/[id]">) {
  const { id } = await params;
  try {
    const sale = await getSale(Number(id));
    return { title: sale.invoiceNumber };
  } catch {
    return { title: "Sale" };
  }
}

export default async function SaleDetailPage({ params }: PageProps<"/sales/[id]">) {
  const { id } = await params;
  const saleId = Number(id);

  if (!Number.isInteger(saleId) || saleId < 1) notFound();

  let sale;
  try {
    sale = await getSale(saleId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const items = sale.items ?? [];

  return (
    <>
      <Link
        href="/sales"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to sales
      </Link>

      <PageHeader
        title={sale.invoiceNumber}
        description={`Sold on ${formatDateTime(sale.createdAt)}`}
        action={
          <a
            href={`/api/invoices/${sale.id}`}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download invoice
          </a>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="What was sold"
            description="Exactly as it was at the time of sale — later price changes don't affect this record."
          />
          <Table>
            <thead>
              <tr>
                <Th>Medicine</Th>
                <Th className="text-right">Price each</Th>
                <Th className="text-right">Quantity</Th>
                <Th className="text-right">Line total</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <Td>
                    <p className="font-medium">
                      {item.brandNameSnapshot}
                      {item.strengthSnapshot ? ` ${item.strengthSnapshot}` : ""}
                    </p>
                    <p className="text-xs text-muted">{item.dosageFormSnapshot}</p>
                  </Td>
                  <Td className="text-right tabular-nums text-muted">
                    {formatCurrency(item.unitPrice)}
                  </Td>
                  <Td className="text-right tabular-nums">{item.quantity}</Td>
                  <Td className="text-right font-medium tabular-nums">
                    {formatCurrency(item.lineTotal)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Payment" />
          <CardBody>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatCurrency(sale.subtotal)}</dd>
              </div>

              {sale.discountAmount > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>
                    Discount
                    {sale.discountType === "percentage" && sale.discountValue !== null
                      ? ` (${sale.discountValue}%)`
                      : ""}
                  </dt>
                  <dd className="tabular-nums">
                    −{formatCurrency(sale.discountAmount)}
                  </dd>
                </div>
              ) : (
                <div className="flex justify-between">
                  <dt className="text-muted">Discount</dt>
                  <dd className="text-muted">None given</dd>
                </div>
              )}

              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total paid</dt>
                <dd className="tabular-nums">{formatCurrency(sale.totalAmount)}</dd>
              </div>

              <div className="flex justify-between pt-2">
                <dt className="text-muted">Paid by</dt>
                <dd className="capitalize">{sale.paymentMethod}</dd>
              </div>

              {sale.createdBy && (
                <div className="flex justify-between">
                  <dt className="text-muted">Served by</dt>
                  <dd className="truncate">{sale.createdBy.email}</dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
