import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Th, Td, EmptyRow } from "@/components/ui/table";
import { sales, findMedicine } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Sales" };

const paymentTones = {
  cash: "success",
  card: "info",
  insurance: "warning",
  mobile: "neutral",
} as const;

export default function SalesPage() {
  const revenue = sales.reduce((sum, s) => sum + s.total, 0);

  return (
    <>
      <PageHeader
        title="Sales"
        description={`${sales.length} invoices · ${formatCurrency(revenue)} total`}
      />

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Invoice</Th>
              <Th>Customer</Th>
              <Th>Items</Th>
              <Th>Payment</Th>
              <Th>Date</Th>
              <Th className="text-right">Subtotal</Th>
              <Th className="text-right">Tax</Th>
              <Th className="text-right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <EmptyRow colSpan={8} message="No sales recorded yet." />
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-background/60">
                  <Td className="font-medium">{sale.invoiceNumber}</Td>
                  <Td>
                    {sale.customerName || "Walk-in"}
                    {sale.prescriptionRef && (
                      <p className="font-mono text-xs text-muted">
                        {sale.prescriptionRef}
                      </p>
                    )}
                  </Td>
                  <Td className="text-muted">
                    {findMedicine(sale.items[0].medicineId)?.name ?? "—"}
                    {sale.items.length > 1 && ` +${sale.items.length - 1}`}
                  </Td>
                  <Td>
                    <Badge tone={paymentTones[sale.paymentMethod]}>
                      {sale.paymentMethod}
                    </Badge>
                  </Td>
                  <Td className="text-muted">{formatDate(sale.createdAt)}</Td>
                  <Td className="text-right tabular-nums text-muted">
                    {formatCurrency(sale.subtotal)}
                  </Td>
                  <Td className="text-right tabular-nums text-muted">
                    {formatCurrency(sale.tax)}
                  </Td>
                  <Td className="text-right font-medium tabular-nums">
                    {formatCurrency(sale.total)}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
