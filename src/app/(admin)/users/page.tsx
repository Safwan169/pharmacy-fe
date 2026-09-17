import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { AddUserForm, UserRowActions } from "@/components/users/user-forms";
import { apiFetch, ApiError } from "@/lib/api/client";
import { requireOwner } from "@/lib/current-user";
import { formatDate } from "@/lib/utils";
import type { ManagedUser } from "@/types";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireOwner();

  let users: ManagedUser[];
  try {
    users = await apiFetch<ManagedUser[]>("/users", { auth: true });
  } catch (error) {
    return <Alert tone="error">{error instanceof ApiError ? error.message : "Please refresh to try again."}</Alert>;
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Who can sign in. Owners can do everything; cashiers can sell, look things up and take returns."
      />

      <Card className="mb-5">
        <CardHeader title="Add someone" />
        <CardBody>
          <AddUserForm />
        </CardBody>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th className="hidden sm:table-cell">Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th className="hidden md:table-cell">Added</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="align-top">
                <Td>
                  <p className="font-medium">{u.name ?? "—"}</p>
                  {u.id === me.id && <p className="text-xs text-muted">You</p>}
                  <p className="text-xs text-muted sm:hidden">{u.email}</p>
                </Td>
                <Td className="hidden text-muted sm:table-cell">{u.email}</Td>
                <Td>
                  <Badge tone={u.role === "owner" ? "info" : "neutral"}>{u.role === "owner" ? "Owner" : "Cashier"}</Badge>
                </Td>
                <Td>{u.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Deactivated</Badge>}</Td>
                <Td className="hidden text-muted md:table-cell">{formatDate(u.created_at)}</Td>
                <Td className="text-right">
                  <UserRowActions user={u} isSelf={u.id === me.id} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
