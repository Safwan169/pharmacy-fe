import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Th, Td, EmptyRow } from "@/components/ui/table";
import { suppliers } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Suppliers" };

export default function SuppliersPage() {
  return (
    <>
      <PageHeader
        title="Suppliers"
        description={`${suppliers.length} registered suppliers`}
        action={
          <LinkButton href="/suppliers/new">
            <Plus className="h-4 w-4" />
            Add supplier
          </LinkButton>
        }
      />

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Supplier</Th>
              <Th>Contact</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th>License</Th>
              <Th>Added</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <EmptyRow colSpan={7} message="No suppliers yet." />
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-background/60">
                  <Td className="font-medium">{s.name}</Td>
                  <Td className="text-muted">{s.contactPerson || "—"}</Td>
                  <Td className="text-muted">{s.email}</Td>
                  <Td className="tabular-nums text-muted">{s.phone}</Td>
                  <Td className="font-mono text-xs text-muted">
                    {s.licenseNumber || "—"}
                  </Td>
                  <Td className="text-muted">{formatDate(s.createdAt)}</Td>
                  <Td>
                    <Badge tone={s.isActive ? "success" : "neutral"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
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
