"use client";

import { useMemo } from "react";
import { Combobox, cn } from "@erp/ui";
import { FELADAT_KATEGORIA_MAX, kategoriaKulcs } from "@erp/feladat/client";

/**
 * Category field (#65): type to search the categories used so far (most used first) and pick
 * one, or type a new one. A new spelling of an existing category (other case / accents) is
 * saved with the existing spelling, so the list does not fork. Required on a new or edited task
 * (#68) — `invalid` marks it red after a failed submit.
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
  const options = useMemo(
    () => kategoriak.map((n) => ({ value: n, label: n })),
    [kategoriak],
  );
  const pontos = kategoriak.find(
    (n) => value.trim() && kategoriaKulcs(n) === kategoriaKulcs(value),
  );
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        invalid &&
          "[&_input]:border-danger [&_input]:ring-danger/20 [&_input]:ring-[3px]",
        className,
      )}
    >
      <Combobox
        id={id}
        value={value}
        onChange={(v) => onChange(v.slice(0, FELADAT_KATEGORIA_MAX))}
        options={options}
        placeholder="Keress vagy írj újat — pl. Beszerzés"
        emptyMessage="Új kategória — mentéskor felvesszük"
        disabled={disabled}
      />
      {value.trim() && !pontos && (
        <span className="text-muted-foreground text-xs">Új kategória lesz.</span>
      )}
    </div>
  );
}
