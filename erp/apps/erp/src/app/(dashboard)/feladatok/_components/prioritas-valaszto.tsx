"use client";

import { cn } from "@erp/ui";
import {
  FELADAT_PRIORITASOK,
  FELADAT_PRIORITAS_LABELS,
  type FeladatPrioritas,
} from "@erp/feladat/client";

const AKTIV: Record<FeladatPrioritas, string> = {
  normal: "border-foreground bg-foreground text-background",
  magas: "border-warning bg-warning text-warning-foreground",
  surgos: "border-danger bg-danger text-danger-foreground",
};

/** Normál / Magas / Sürgős as a radio group (arrow keys move, like native radios). */
export function PrioritasValaszto({
  value,
  onChange,
}: {
  value: FeladatPrioritas;
  onChange: (p: FeladatPrioritas) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="radiogroup"
      aria-label="Prioritás"
      onKeyDown={(e) => {
        const i = FELADAT_PRIORITASOK.indexOf(value);
        const lep =
          e.key === "ArrowRight" || e.key === "ArrowDown"
            ? 1
            : e.key === "ArrowLeft" || e.key === "ArrowUp"
              ? -1
              : 0;
        if (!lep) return;
        e.preventDefault();
        const kov =
          FELADAT_PRIORITASOK[
            (i + lep + FELADAT_PRIORITASOK.length) % FELADAT_PRIORITASOK.length
          ]!;
        onChange(kov);
        (
          e.currentTarget.querySelector(`[data-p="${kov}"]`) as HTMLElement | null
        )?.focus();
      }}
    >
      {FELADAT_PRIORITASOK.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          data-p={p}
          aria-checked={value === p}
          tabIndex={value === p ? 0 : -1}
          onClick={() => onChange(p)}
          className={cn(
            "focus-visible:ring-ring rounded-full border px-3 py-1 text-xs font-medium outline-none focus-visible:ring-2",
            value === p ? AKTIV[p] : "hover:bg-muted",
          )}
        >
          {FELADAT_PRIORITAS_LABELS[p]}
        </button>
      ))}
    </div>
  );
}
