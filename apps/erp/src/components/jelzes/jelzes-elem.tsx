"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@erp/ui";
import type { JelzesSor } from "@erp/jelzes";
import { olvasottAction } from "@/app/(dashboard)/jelzesek/actions";

import { formatJelzesDatum, JelzesTipusBadge } from "./jelzes-tipus";

/**
 * One Jelzés: unread ones are highlighted; a click marks it read and opens its page (an app path
 * in place, an https link in a new tab).
 */
export function JelzesElem({
  sor,
  tomor = false,
  onMegnyitva,
}: {
  sor: JelzesSor;
  /** The bell panel: text clamped to a few lines. */
  tomor?: boolean;
  onMegnyitva?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const megnyit = () =>
    startTransition(async () => {
      if (!sor.olvasva) await olvasottAction([sor.id]);
      onMegnyitva?.();
      if (sor.url?.startsWith("/")) router.push(sor.url);
      else if (sor.url?.startsWith("https://"))
        window.open(sor.url, "_blank", "noopener,noreferrer");
      router.refresh();
    });

  return (
    <button
      type="button"
      onClick={megnyit}
      disabled={pending}
      className={cn(
        "hover:bg-accent flex w-full gap-3 rounded-md border p-3 text-left transition-colors disabled:opacity-60",
        sor.olvasva ? "bg-card" : "border-info-border bg-info-soft",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          sor.olvasva ? "bg-transparent" : "bg-info",
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cn("text-sm", sor.olvasva ? "font-medium" : "font-semibold")}>
            {sor.cim}
          </span>
          <JelzesTipusBadge tipus={sor.tipus} />
        </span>
        {sor.szoveg && (
          <span
            className={cn(
              "text-muted-foreground whitespace-pre-line text-sm",
              tomor && "line-clamp-3",
            )}
          >
            {sor.szoveg}
          </span>
        )}
        <span className="text-muted-foreground text-xs">
          {[sor.kuldoNev, formatJelzesDatum(sor.createdAt)].filter(Boolean).join(" · ")}
          {!sor.olvasva && <span className="sr-only"> · olvasatlan</span>}
        </span>
      </span>
    </button>
  );
}
