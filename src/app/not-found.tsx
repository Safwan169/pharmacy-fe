import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-border/50">
        <FileQuestion className="h-6 w-6 text-muted" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-semibold">We couldn&apos;t find that page</h1>
      <p className="mt-1 max-w-md text-sm text-muted">
        The link may be out of date, or the item may have been removed from the
        catalogue.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to the dashboard
      </Link>
    </div>
  );
}
