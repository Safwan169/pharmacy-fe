"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

const KEY = "pharmacy.counterFocus";
const EVENT = "pharmacy:counter-focus";

/**
 * Whether this till runs the counter full screen. Kept in localStorage rather
 * than React state so it survives a reload, and read through
 * `useSyncExternalStore` so the server render (always "no") and the browser
 * agree on the first paint.
 */
const focusStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(EVENT, onChange);
    };
  },
  get(): boolean {
    try {
      return window.localStorage.getItem(KEY) === "1";
    } catch {
      // Private window or blocked storage: the normal layout is a fine default.
      return false;
    }
  },
};

/**
 * Full-screen counter.
 *
 * The sidebar and top bar earn their space everywhere except at the counter,
 * where a customer is waiting and the basket wants every pixel. On /pos a
 * toggle folds both away, and the choice is remembered on that device.
 */
export function CounterChrome({
  sidebar,
  topbar,
  children,
}: {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const atCounter = pathname === "/pos";
  const focus = useSyncExternalStore(focusStore.subscribe, focusStore.get, () => false);
  const t = useT();

  function toggle() {
    try {
      window.localStorage.setItem(KEY, focus ? "0" : "1");
    } catch {
      // Not being able to remember it is no reason to refuse the toggle.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  const hidden = atCounter && focus;

  return (
    <div className="flex h-screen overflow-hidden">
      {!hidden && sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        {!hidden && topbar}
        <main
          data-focus={hidden ? "1" : undefined}
          className={cn("relative flex-1 overflow-x-hidden overflow-y-auto", hidden ? "p-3" : "p-4 lg:p-6")}
        >
          {atCounter && (
            <button
              type="button"
              onClick={toggle}
              title={hidden ? t("pos.exitFocus") : t("pos.focus")}
              aria-label={hidden ? t("pos.exitFocus") : t("pos.focus")}
              className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted shadow-sm hover:text-foreground"
            >
              {hidden ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
            </button>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
