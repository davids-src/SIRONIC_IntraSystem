"use client";

import { useMemo, useState } from "react";
import { CheckIcon, SearchIcon, XIcon } from "lucide-react";
import { cn } from "@erp/lib";
import { Badge } from "../badge";
import type { BadgeTone } from "./types";

type Option = { value: string; label: string };

/**
 * Searchable multi-select used by the filter panel: selected values show as removable badges,
 * a search box narrows the (possibly long) option list, and clicking an option toggles it.
 * Each selected value is posted as a hidden `f.<key>.<value>=on` input, which is what
 * `FilterPanel`'s submit handler already reads for checkbox lists.
 */
export function DataTableSelectFilter({
  name,
  label,
  options,
  defaultSelected,
  tones,
}: {
  name: string;
  label: string;
  options: Option[];
  defaultSelected: string[];
  tones?: Record<string, BadgeTone>;
}) {
  const [selected, setSelected] = useState<string[]>(defaultSelected);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("hu-HU");
    return q
      ? options.filter((o) => o.label.toLocaleLowerCase("hu-HU").includes(q))
      : options;
  }, [options, query]);
  const showSearch = options.length > 6;

  const toggle = (value: string) =>
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => setSelected([])}
            className="text-muted-foreground text-xs hover:underline"
          >
            Törlés ({selected.length})
          </button>
        )}
      </div>

      {selected.map((v) => (
        <input key={v} type="hidden" name={`${name}.${v}`} value="on" />
      ))}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              aria-label={`${labelOf(v)} eltávolítása`}
            >
              <Badge variant={tones?.[v] ?? "info"} className="gap-1 pr-1.5">
                {labelOf(v)}
                <XIcon className="size-3" />
              </Badge>
            </button>
          ))}
        </div>
      )}

      {showSearch && (
        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute left-2 top-1/2 size-3.5 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // don't submit the whole panel
                if (filtered.length === 1 && filtered[0]) {
                  toggle(filtered[0].value);
                  setQuery("");
                }
              }
            }}
            placeholder={`Keresés: ${label.toLocaleLowerCase("hu-HU")}…`}
            className="bg-background h-8 w-full rounded-md border pl-7 pr-2 text-sm"
          />
        </div>
      )}

      {(!showSearch || open || query) && (
        <ul
          className="max-h-44 overflow-y-auto rounded-md border p-1"
          role="listbox"
          aria-multiselectable
        >
          {filtered.length === 0 && (
            <li className="text-muted-foreground px-2 py-1.5 text-sm">Nincs találat</li>
          )}
          {filtered.map((o) => {
            const on = selected.includes(o.value);
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm",
                    on && "bg-accent font-medium",
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {on && <CheckIcon className="size-3.5" />}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
