import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { Card, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { getSettings } from "@/lib/api/customers";
import { listBackups } from "@/lib/api/reports";
import { BackupPanel } from "@/components/settings/backup-panel";
import { ApiError } from "@/lib/api/client";
import { requireOwner } from "@/lib/current-user";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireOwner();
  let settings;
  try {
    settings = await getSettings();
  } catch (error) {
    return <Alert tone="error">{error instanceof ApiError ? error.message : "Please refresh to try again."}</Alert>;
  }
  let backups: { dir: string; files: { name: string; size_bytes: number; created_at: string }[] } | null = null;
  try {
    backups = await listBackups();
  } catch {
    backups = null;
  }
  return (
    <>
      <PageHeader title="Settings" description="What goes on receipts, and when stock counts as low." />
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
