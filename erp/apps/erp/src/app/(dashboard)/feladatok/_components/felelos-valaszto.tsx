"use client";

import { useId, useMemo, useState } from "react";
import { AnchoredDropdown, Input, cn } from "@erp/ui";

/**
 * Searchable colleague picker for giving a task: type part of a name, pick one. Unlike the HR
 * munkaidő filter's picker there is no "Mindenki" choice — a task always goes to one person.
 * Submits the chosen user id through a hidden `name` input.
 */
export function FelelosValaszto({
  name,
  emberek,
}: {
  name: string;
  emberek: Array<{ id: string; nev: string }>;
}) {
  const listId = useId();
  const [kivalasztott, setKivalasztott] = useState("");
  const [szoveg, setSzoveg] = useState("");
  const [open, setOpen] = useState(false);

  const talalatok = useMemo(() => {
    const q = szoveg.trim().toLowerCase();
    const aktiv = emberek.find((e) => e.id === kivalasztott);
    if (!q || aktiv?.nev.toLowerCase() === q) return emberek;
    return emberek.filter((e) => e.nev.toLowerCase().includes(q));
  }, [emberek, szoveg, kivalasztott]);

  const valaszt = (id: string, nev: string) => {
    setKivalasztott(id);
    setSzoveg(nev);
    setOpen(false);
  };

  return (
    <>
      <input type="hidden" name={name} value={kivalasztott} />
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
              setOpen(true);
              setKivalasztott("");
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter" && open && talalatok.length === 1) {
                e.preventDefault();
                valaszt(talalatok[0]!.id, talalatok[0]!.nev);
              }
            }}
            placeholder="Kezdd el gépelni a nevet…"
            autoComplete="off"
            role="combobox"
            aria-label="Kinek adod?"
            aria-expanded={open}
            aria-controls={listId}
          />
        }
      >
        <ul>
          {talalatok.length === 0 && (
            <li className="text-muted-foreground px-3 py-2 text-sm">
              Nincs ilyen nevű kolléga
            </li>
          )}
          {talalatok.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                role="option"
                aria-selected={e.id === kivalasztott}
                className={cn(
                  "hover:bg-accent flex w-full px-3 py-2 text-left text-sm",
                  e.id === kivalasztott && "bg-accent",
                )}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  valaszt(e.id, e.nev);
                }}
              >
                {e.nev}
              </button>
            </li>
          ))}
        </ul>
      </AnchoredDropdown>
    </>
  );
}
