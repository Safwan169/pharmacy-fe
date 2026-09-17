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
import { getT } from "@/i18n/server";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireOwner();
  const t = await getT();

  let users: ManagedUser[];
  try {
    users = await apiFetch<ManagedUser[]>("/users", { auth: true });
  } catch (error) {
    return <Alert tone="error">{error instanceof ApiError ? error.message : t("common.refresh")}</Alert>;
  }

  return (
    <>
      <PageHeader
        title={t("users.title")}
        description={t("users.description")}
      />

      <Card className="mb-5">
        <CardHeader title={t("users.add")} />
        <CardBody>
          <AddUserForm />
        </CardBody>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>{t("th.name")}</Th>
              <Th className="hidden sm:table-cell">{t("login.email")}</Th>
              <Th>{t("users.role")}</Th>
              <Th>{t("th.status")}</Th>
              <Th className="hidden md:table-cell">{t("users.added")}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="align-top">
                <Td>
                  <p className="font-medium">{u.name ?? "—"}</p>
                  {u.id === me.id && <p className="text-xs text-muted">{t("users.you")}</p>}
                  <p className="text-xs text-muted sm:hidden">{u.email}</p>
                </Td>
                <Td className="hidden text-muted sm:table-cell">{u.email}</Td>
                <Td>
                  <Badge tone={u.role === "owner" ? "info" : "neutral"}>{u.role === "owner" ? t("role.owner") : t("role.cashier")}</Badge>
                </Td>
                <Td>{u.is_active ? <Badge tone="success">{t("users.active")}</Badge> : <Badge tone="danger">{t("users.deactivated")}</Badge>}</Td>
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
