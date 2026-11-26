"use client";

import { useId, useMemo, useState } from "react";
import { StarIcon, UserIcon, UsersIcon, XIcon } from "lucide-react";
import { AnchoredDropdown, Input, cn } from "@erp/ui";
import { monogram, type FeladatCimzett } from "@erp/feladat/client";

/**
 * Picks one or more recipients: "Magamnak" for an own task, names one by one (type to search,
 * ↑/↓ to move, Enter to add, Backspace on an empty box removes the last one), or a whole role at
 * once ("+ Gépkezelő · 12"). The picked people are chips; with several, the star on a chip makes
 * that person the elsődleges felelős (#48) — the chip says so in words too.
 */
export function CimzettValaszto({
  emberek,
  sajatId,
  value,
  onChange,
  elsodlegesId,
  onElsodleges,
  magamnak = true,
}: {
  emberek: FeladatCimzett[];
  sajatId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  elsodlegesId?: string;
  onElsodleges?: (id: string) => void;
  /** Offer "Magamnak" (an own task / own copy). */
  magamnak?: boolean;
}) {
  const listId = useId();
  const [szoveg, setSzoveg] = useState("");
  const [open, setOpen] = useState(false);
  const [kiemelt, setKiemelt] = useState(0);
  const kijelolt = useMemo(() => new Set(value), [value]);
  const nevById = useMemo(() => new Map(emberek.map((e) => [e.id, e.nev])), [emberek]);

  const talalatok = useMemo(() => {
    const q = szoveg.trim().toLowerCase();
    return emberek
      .filter(
        (e) =>
          !kijelolt.has(e.id) &&
          (!q ||
            e.nev.toLowerCase().includes(q) ||
            e.szerepkorok.some((r) => r.toLowerCase().includes(q))),
      )
      .slice(0, 50);
  }, [emberek, szoveg, kijelolt]);

  const szerepkorok = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of emberek)
      for (const r of e.szerepkorok) m.set(r, [...(m.get(r) ?? []), e.id]);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "hu"));
  }, [emberek]);

  const hozzaad = (ids: string[]) => onChange([...new Set([...value, ...ids])]);
  const levesz = (id: string) => onChange(value.filter((v) => v !== id));
  const valaszt = (id: string) => {
    hozzaad([id]);
    setSzoveg("");
    setKiemelt(0);
  };
  const csoportos = value.length > 1 && Boolean(onElsodleges);

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Kijelölt címzettek">
          {value.map((id) => {
            const nev = id === sajatId ? "Én" : (nevById.get(id) ?? "?");
            const elso = csoportos && elsodlegesId === id;
            return (
              <li
                key={id}
                className={cn(
                  "bg-card inline-flex items-center gap-1 rounded-full border py-0.5 pl-0.5 pr-1 text-xs",
                  elso && "border-warning bg-warning-soft",
                )}
              >
                <span className="bg-muted inline-flex size-5 items-center justify-center rounded-full text-[9px] font-semibold">
                  {id === sajatId ? (
                    <UserIcon className="size-3" aria-hidden />
                  ) : (
                    monogram(nev)
                  )}
                </span>
                <span className="font-medium">{nev}</span>
                {elso && <span className="text-muted-foreground">· elsődleges</span>}
                {csoportos && (
                  <button
                    type="button"
                    onClick={() => onElsodleges!(id)}
                    aria-pressed={elso}
                    className="hover:bg-muted rounded-full p-0.5"
                    title={
                      elso ? "Ő az elsődleges felelős" : "Legyen ő az elsődleges felelős"
                    }
                    aria-label={`${nev}: elsődleges felelős`}
                  >
                    <StarIcon
                      className={cn(
                        "size-3.5",
                        elso ? "text-warning fill-current" : "text-muted-foreground",
                      )}
                    />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => levesz(id)}
                  className="hover:bg-muted rounded-full p-0.5"
                  aria-label={`${nev} eltávolítása`}
                >
                  <XIcon className="size-3" />
                </button>
              </li>
            );
          })}
          {value.length > 1 && (
            <li>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-muted-foreground px-1 text-xs underline"
              >
                mind törlése
              </button>
            </li>
          )}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {magamnak && (
          <button
            type="button"
            onClick={() => (kijelolt.has(sajatId) ? levesz(sajatId) : hozzaad([sajatId]))}
            aria-pressed={kijelolt.has(sajatId)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
              kijelolt.has(sajatId)
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            <UserIcon className="h-3 w-3" /> Magamnak
          </button>
        )}
        <AnchoredDropdown
          open={open}
          onClose={() => setOpen(false)}
          id={listId}
          anchorClassName="w-full sm:w-64"
          anchor={
            <Input
              value={szoveg}
              onChange={(e) => {
                setSzoveg(e.target.value);
                setKiemelt(0);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setOpen(true);
                  setKiemelt((k) => Math.min(k + 1, talalatok.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setKiemelt((k) => Math.max(k - 1, 0));
                }
                if (e.key === "Enter" && open && talalatok.length > 0) {
                  e.preventDefault();
                  valaszt(talalatok[Math.min(kiemelt, talalatok.length - 1)]!.id);
                }
                if (e.key === "Backspace" && !szoveg && value.length > 0)
                  levesz(value.at(-1)!);
              }}
              placeholder="Kolléga hozzáadása — kezdd el gépelni…"
              autoComplete="off"
              role="combobox"
              aria-label="Kinek adod?"
              aria-expanded={open}
              aria-controls={listId}
              aria-activedescendant={
                open && talalatok[kiemelt]
                  ? `${listId}-${talalatok[kiemelt]!.id}`
                  : undefined
              }
            />
          }
        >
          <ul role="listbox">
            {talalatok.length === 0 && (
              <li className="text-muted-foreground px-3 py-2 text-sm">
                Nincs több ilyen nevű kolléga
              </li>
            )}
            {talalatok.map((e, i) => (
              <li
                key={e.id}
                id={`${listId}-${e.id}`}
                role="option"
                aria-selected={i === kiemelt}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  className={cn(
                    "hover:bg-accent flex w-full flex-col px-3 py-2 text-left text-sm",
                    i === kiemelt && "bg-accent",
                  )}
                  onMouseEnter={() => setKiemelt(i)}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    valaszt(e.id);
                  }}
                >
                  {e.nev}
                  {e.szerepkorok.length > 0 && (
                    <span className="text-muted-foreground text-xs">
                      {e.szerepkorok.join(", ")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </AnchoredDropdown>
      </div>

      {szerepkorok.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground inline-flex items-center gap-1">
            <UsersIcon className="h-3 w-3" /> Egész szerepkör:
          </span>
          {szerepkorok.map(([nev, ids]) => (
            <button
              key={nev}
              type="button"
              onClick={() => hozzaad(ids)}
              className="hover:bg-accent bg-muted rounded-full px-2.5 py-0.5"
            >
              + {nev} · {ids.length}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
