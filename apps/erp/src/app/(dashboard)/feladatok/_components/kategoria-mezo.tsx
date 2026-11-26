"use client";

import { cn } from "@erp/ui";

/**
 * Category field: pick one of the categories the admins maintain (Adminisztráció → Feladat
 * kategóriák; the defaults are the module names). No free typing. Required on a new or edited
 * task (#68) — `invalid` marks it red after a failed submit. A value that is no longer in the
 * list (retired category) stays visible so an edit does not silently drop it.
 */
export function KategoriaMezo({
  value,
  onChange,
  kategoriak,
  id,
  className,
  disabled,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  kategoriak: string[];
  id?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const lista =
    value && !kategoriak.includes(value) ? [value, ...kategoriak] : kategoriak;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={invalid}
        className={cn(
          "border-input bg-background shadow-xs h-9 w-full rounded-md border px-3 text-sm outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-danger ring-danger/20 ring-[3px]",
        )}
      >
        <option value="">Válassz kategóriát…</option>
        {lista.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}
