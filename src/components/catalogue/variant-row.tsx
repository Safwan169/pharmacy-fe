"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Makes a whole catalogue row open the variant. The medicine name stays a real
 * link inside the row, so prefetching, keyboard focus and open-in-new-tab keep
 * working — this only adds the click target around it.
 */
export function VariantRow({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <tr
      onClick={(event) => {
        // Let the browser handle modified clicks and clicks on real controls.
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
        if ((event.target as HTMLElement).closest("a, button, input, select, label")) return;
        router.push(href);
      }}
      onMouseEnter={() => router.prefetch(href)}
      className="cursor-pointer hover:bg-background/60"
    >
      {children}
    </tr>
  );
}
