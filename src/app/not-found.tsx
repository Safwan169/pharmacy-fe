import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-border/50">
        <FileQuestion className="h-6 w-6 text-muted" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-semibold">{t("notFound.title")}</h1>
      <p className="mt-1 max-w-md text-sm text-muted">
        {t("notFound.body")}
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {t("notFound.back")}
      </Link>
    </div>
  );
}
