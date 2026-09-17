import { PageHeader } from "@/components/layout/page-header";
import { CounterTerminal } from "@/components/pos/counter-terminal";
import { getT } from "@/i18n/server";

export const metadata = { title: "Counter" };

export default async function CounterPage() {
  const t = await getT();
  return (
    <>
      <PageHeader
        title={t("pos.title")}
        description={t("pos.description")}
      />
      <CounterTerminal />
    </>
  );
}
