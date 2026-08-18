import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Th, Td, EmptyRow } from "@/components/ui/table";
import { medicines, findCategory, findSupplier } from "@/lib/mock-data";
import {
  getStockStatus,
  getExpiryStatus,
  stockLabels,
  stockTones,
  expiryTones,
} from "@/lib/inventory";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Medicines" };

export default function MedicinesPage() {
  return (
    <>
      <PageHeader
        title="Medicines"
        description={`${medicines.length} items in inventory`}
        action={
          <LinkButton href="/medicines/new">
            <Plus className="h-4 w-4" />
            Add medicine
          </LinkButton>
        }
      />

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Medicine</Th>
              <Th>Category</Th>
              <Th>Supplier</Th>
              <Th>Batch</Th>
              <Th className="text-right">Qty</Th>
              <Th className="text-right">Price</Th>
              <Th>Expiry</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {medicines.length === 0 ? (
              <EmptyRow colSpan={8} message="No medicines yet." />
            ) : (
              medicines.map((m) => {
                const stock = getStockStatus(m);
                const expiry = getExpiryStatus(m);
                return (
                  <tr key={m.id} className="hover:bg-background/60">
                    <Td>
                      <Link
                        href={`/medicines/${m.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {m.name}
                      </Link>
                      <p className="text-xs text-muted">
                        {m.genericName || m.brand || m.dosageForm}
                        {m.prescriptionRequired && " · Rx"}
                      </p>
                    </Td>
                    <Td className="text-muted">
                      {findCategory(m.categoryId)?.name ?? "—"}
                    </Td>
                    <Td className="text-muted">
                      {findSupplier(m.supplierId)?.name ?? "—"}
                    </Td>
                    <Td className="font-mono text-xs text-muted">{m.batchNumber}</Td>
                    <Td className="text-right tabular-nums">{m.quantity}</Td>
                    <Td className="text-right tabular-nums">
                      {formatCurrency(m.sellingPrice)}
                    </Td>
                    <Td>
                      <Badge tone={expiryTones[expiry]}>
                        {formatDate(m.expiryDate)}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge tone={stockTones[stock]}>{stockLabels[stock]}</Badge>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
