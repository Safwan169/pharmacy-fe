import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { Card, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { getSettings } from "@/lib/api/customers";
import { listBackups } from "@/lib/api/reports";
import { BackupPanel } from "@/components/settings/backup-panel";
import { ApiError } from "@/lib/api/client";
import { requireOwner } from "@/lib/current-user";
import { getT } from "@/i18n/server";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireOwner();
  const t = await getT();
  let settings;
  try {
    settings = await getSettings();
  } catch (error) {
    return <Alert tone="error">{error instanceof ApiError ? error.message : t("common.refresh")}</Alert>;
  }
  let backups: { dir: string; files: { name: string; size_bytes: number; created_at: string }[] } | null = null;
  try {
    backups = await listBackups();
  } catch {
    backups = null;
  }
  return (
    <>
      <PageHeader title={t("settings.title")} description={t("settings.description")} />
      <Card>
        <CardBody>
          <SettingsForm settings={settings} />
        </CardBody>
      </Card>
      <Card className="mt-5">
        <CardBody>
          <BackupPanel backups={backups} />
        </CardBody>
      </Card>
    </>
  );
}
