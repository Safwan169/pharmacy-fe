"use client";

import { setLocale } from "@/lib/actions/locale";
import { useLocale } from "@/i18n/client";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "en", label: "EN" },
  { value: "bn", label: "বাং" },
] as const;

/** EN / বাং toggle; the choice is stored in a cookie so every page follows it. */
export function LanguageSwitch() {
  const current = useLocale();
  return (
    <form action={setLocale} className="flex rounded-lg border border-border p-0.5" aria-label="Language">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="submit"
          name="locale"
          value={value}
          aria-pressed={current === value}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            current === value ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </form>
  );
}
