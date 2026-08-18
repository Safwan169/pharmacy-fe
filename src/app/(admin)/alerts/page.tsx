import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Th, Td, EmptyRow } from "@/components/ui/table";
import { medicines, findSupplier } from "@/lib/mock-data";
import {
  getStockStatus,
  getExpiryStatus,
  stockLabels,
  stockTones,
  expiryLabels,
  expiryTones,
} from "@/lib/inventory";
import { daysUntil, formatDate } from "@/lib/utils";

export const metadata = { title: "Stock alerts" };

export default function AlertsPage() {
  const lowStock = medicines.filter((m) => getStockStatus(m) !== "in-stock");
  const expiring = medicines
    .filter((m) => getExpiryStatus(m) !== "valid")
    .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate));

  return (
    <>
      <PageHeader
        title="Stock alerts"
        description="Items needing a reorder or nearing expiry."
      />

      <div className="space-y-5">
        <Card>
          <CardHeader
            title="Restock needed"
            description="At or below the configured reorder level"
          />
          <Table>
            <thead>
              <tr>
                <Th>Medicine</Th>
                <Th>Supplier</Th>
                <Th className="text-right">In stock</Th>
                <Th className="text-right">Reorder at</Th>
                <Th className="text-right">Shortfall</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {lowStock.length === 0 ? (
                <EmptyRow colSpan={6} message="Nothing needs restocking." />
              ) : (
                lowStock.map((m) => {
                  const status = getStockStatus(m);
                  return (
                    <tr key={m.id} className="hover:bg-background/60">
                      <Td className="font-medium">{m.name}</Td>
                      <Td className="text-muted">
                        {findSupplier(m.supplierId)?.name ?? "—"}
                      </Td>
                      <Td className="text-right tabular-nums">{m.quantity}</Td>
                      <Td className="text-right tabular-nums text-muted">
                        {m.reorderLevel}
                      </Td>
                      <Td className="text-right font-medium tabular-nums">
                        {Math.max(0, m.reorderLevel - m.quantity)}
                      </Td>
                      <Td>
                        <Badge tone={stockTones[status]}>{stockLabels[status]}</Badge>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader
            title="Expiry watch"
            description="Expired or expiring within 90 days"
          />
          <Table>
            <thead>
              <tr>
                <Th>Medicine</Th>
                <Th>Batch</Th>
                <Th className="text-right">Qty</Th>
                <Th>Expiry date</Th>
                <Th className="text-right">Days left</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {expiring.length === 0 ? (
                <EmptyRow colSpan={6} message="No items nearing expiry." />
              ) : (
                expiring.map((m) => {
                  const status = getExpiryStatus(m);
                  const days = daysUntil(m.expiryDate);
                  return (
                    <tr key={m.id} className="hover:bg-background/60">
                      <Td className="font-medium">{m.name}</Td>
                      <Td className="font-mono text-xs text-muted">
                        {m.batchNumber}
                      </Td>
                      <Td className="text-right tabular-nums">{m.quantity}</Td>
                      <Td className="text-muted">{formatDate(m.expiryDate)}</Td>
                      <Td className="text-right font-medium tabular-nums">
                        {days < 0 ? `${Math.abs(days)} overdue` : days}
                      </Td>
                      <Td>
                        <Badge tone={expiryTones[status]}>{expiryLabels[status]}</Badge>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
