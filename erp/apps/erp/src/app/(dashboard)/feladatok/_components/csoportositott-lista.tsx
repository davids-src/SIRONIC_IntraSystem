"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { Badge, Input, cn } from "@erp/ui";
import { FELADAT_PRIORITAS_LABELS, FELADAT_PRIORITAS_TONES } from "@erp/feladat/client";
import { NAP } from "@/lib/teendo";
import {
  LISTA_CSOPORTOSITASOK,
  csoportositSorok,
  type ListaCsoportositas,
  type ListaSor,
} from "@/lib/feladat-lista";

/**
 * Feladatok grouped (#65): one section per kategória (or felelős / kiadó) with its count, open
 * and overdue tasks, then the group's rows — each opens the task. Its own search box filters
 * across all groups; the flat table (with its filters) is one click away.
 */
export function CsoportositottLista({
  sorok,
  szerint,
  ures,
}: {
  sorok: ListaSor[];
  szerint: ListaCsoportositas;
  ures: string;
}) {
  const [kereso, setKereso] = useState("");
  const csoportok = useMemo(() => {
    const q = kereso.trim().toLowerCase();
    const szurt = q
      ? sorok.filter((s) =>
          [s.cim, s.alcim, s.felelos, s.kiado, s.kategoria, s.folyamat]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q)),
        )
      : sorok;
    return csoportositSorok(szurt, szerint);
  }, [sorok, szerint, kereso]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full sm:w-72" data-export="skip">
        <SearchIcon
          className="text-muted-foreground absolute left-2.5 top-2.5 size-4"
          aria-hidden
        />
        <Input
          value={kereso}
          onChange={(e) => setKereso(e.target.value)}
          placeholder="Keresés a csoportokban…"
          className="pl-8"
          aria-label="Keresés a csoportokban"
        />
      </div>
      {csoportok.length === 0 && <p className="text-muted-foreground text-sm">{ures}</p>}
      {csoportok.map((c) => (
        <details key={c.nev} open className="bg-card group rounded-lg border">
          <summary className="flex cursor-pointer select-none flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
            <h2 className="text-sm font-semibold">{c.nev}</h2>
            <span className="text-muted-foreground text-xs tabular-nums">
              {c.sorok.length} feladat · {c.nyitott} nyitott
            </span>
            {c.lejart > 0 && (
              <span className="text-danger text-xs font-medium tabular-nums">
                {c.lejart} lejárt
              </span>
            )}
          </summary>
          <table className="w-full border-t text-sm">
            <caption className="sr-only">
              {LISTA_CSOPORTOSITASOK[szerint]}: {c.nev}
            </caption>
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="px-4 py-2 font-medium">Feladat</th>
                <th className="px-3 py-2 font-medium">Állapot</th>
                <th className="px-3 py-2 font-medium">Határidő</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">
                  {szerint === "felelos" ? "Kiadó" : "Felelős"}
                </th>
              </tr>
            </thead>
            <tbody>
              {c.sorok.map((s) => (
                <tr key={s._id} className="hover:bg-muted/40 border-t">
                  <td className="px-4 py-2">
                    <Link href={s.href} className="font-medium hover:underline">
                      {s.cim}
                    </Link>
                    {s.prioritas !== "normal" && (
                      <Badge
                        variant={FELADAT_PRIORITAS_TONES[s.prioritas]}
                        className="ml-2"
                      >
                        {FELADAT_PRIORITAS_LABELS[s.prioritas]}
                      </Badge>
                    )}
                    {(s.folyamat || s.alcim) && (
                      <span className="text-muted-foreground line-clamp-1 block text-xs">
                        {s.folyamat ?? s.alcim}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {s.allapot === "modul" ? (
                      <span className="text-muted-foreground text-xs">
                        {s.allapotCimke}
                      </span>
                    ) : (
                      <Badge variant={s.allapotTon} className="whitespace-nowrap">
                        {s.allapotCimke}
                      </Badge>
                    )}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2 tabular-nums",
                      s.kesik && "text-danger font-medium",
                    )}
                  >
                    {s.hatarido ? NAP(s.hatarido) : "—"}
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    {(szerint === "felelos" ? s.kiado : s.felelos) || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </div>
  );
}
