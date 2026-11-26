"use client";

import { useMemo } from "react";
import { Badge, DataTable, cn, type ColumnDef, type DataTableQuery } from "@erp/ui";
import {
  FELADAT_ALLAPOTOK,
  FELADAT_ALLAPOT_LABELS,
  FELADAT_PRIORITASOK,
  FELADAT_PRIORITAS_LABELS,
  FELADAT_PRIORITAS_TONES,
} from "@erp/feladat/client";
import {
  HATARIDO_SAVOK,
  HATARIDO_SAV_LABELS,
  NAP,
  TEENDO_KATEGORIAK,
  TEENDO_KATEGORIA_LABELS,
} from "@/lib/teendo";
import { TEENDO_ALLAPOTOK, type ListaSor } from "@/lib/feladat-lista";
import { SzemelyAvatarok } from "@/components/folyamat/folyamat-ut";

export type ListaNezet = "teendoim" | "kiadott" | "mind" | "lezart";

const defaultQuery: DataTableQuery = { page: 1, pageSize: 50 };

const DAY = 86_400_000;

/** "Ma", "Holnap", "3 napja lejárt" next to the date — the deadline is the main signal. */
function hataridoMegjegyzes(
  hatarido: string,
  ma: string,
  kesik: boolean,
): string | undefined {
  if (!hatarido) return undefined;
  const nap = Math.round((Date.parse(hatarido) - Date.parse(ma)) / DAY);
  if (nap === 0) return "ma";
  if (nap === 1) return "holnap";
  if (nap < 0 && kesik) return `${-nap} napja lejárt`;
  if (nap > 1 && nap <= 7) return `${nap} nap múlva`;
  return undefined;
}

const enumOf = (labels: Record<string, string>, keys: readonly string[]) =>
  keys.map((value) => ({ value, label: labels[value] ?? value }));

/**
 * Every Feladatok view in one system table. A click anywhere on a row opens the task's own page
 * (or, for another module's item, that module's page). Search, filters and column choice are
 * the table's own, remembered per view.
 */
export function FeladatLista({
  sorok,
  nezet,
  ma,
  ures,
}: {
  sorok: ListaSor[];
  nezet: ListaNezet;
  ma: string;
  ures: string;
}) {
  const columns = useMemo<Array<ColumnDef<ListaSor>>>(() => {
    const teendoim = nezet === "teendoim";
    const nevek = (kulcs: "kiado" | "felelos") =>
      [...new Set(sorok.flatMap((s) => (s[kulcs] ? s[kulcs].split(", ") : [])))]
        .sort((a, b) => a.localeCompare(b, "hu"))
        .map((n) => ({ value: n, label: n }));
    const forrasok = TEENDO_KATEGORIAK.filter((k) => sorok.some((s) => s.forras === k));
    const kategoriak = [...new Set(sorok.map((s) => s.kategoria).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "hu"))
      .map((n) => ({ value: n, label: n }));

    return [
      {
        key: "cim",
        label: "Feladat",
        sortable: true,
        searchable: true,
        hideable: false,
        render: (_, s) => (
          <div className="flex min-w-56 flex-col gap-0.5 py-0.5">
            <span className="font-medium leading-snug">{s.cim}</span>
            {(s.alcim || s.lepes || s.haladas) && (
              <span className="text-muted-foreground line-clamp-1 text-xs">
                {[s.haladas, s.lepes, s.alcim].filter(Boolean).join(" · ")}
              </span>
            )}
            {s.folyamat && (
              <span
                className="text-foreground/80 line-clamp-1 text-xs"
                title={s.folyamat}
              >
                {s.folyamat}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "allapot",
        label: "Állapot",
        type: "enum",
        filterable: true,
        enumValues: teendoim
          ? enumOf(TEENDO_ALLAPOTOK, Object.keys(TEENDO_ALLAPOTOK))
          : enumOf(FELADAT_ALLAPOT_LABELS, FELADAT_ALLAPOTOK),
        render: (_, s) =>
          s.allapot === "modul" ? (
            <span className="text-muted-foreground text-xs">{s.allapotCimke}</span>
          ) : (
            <Badge variant={s.allapotTon} className="whitespace-nowrap">
              {s.allapotCimke}
            </Badge>
          ),
      },
      {
        // Who is on it and how far it got (#67): avatars, "2/4 · Kovács Diána", a bar.
        key: "haladasSzazalek",
        label: "Haladás",
        sortable: true,
        exportValue: (s) =>
          [s.haladasCimke, s.resztvevok?.map((r) => r.nev).join(", ")]
            .filter(Boolean)
            .join(" — "),
        render: (_, s) =>
          s.resztvevok?.length || s.haladasCimke ? (
            <div className="flex min-w-36 flex-col gap-1 py-0.5">
              {s.resztvevok && s.resztvevok.length > 0 && (
                <SzemelyAvatarok
                  szemelyek={s.resztvevok.map((r) => ({
                    nev: `${r.nev}${r.kesz ? " — kész" : r.most ? " — most nála" : ""}`,
                    kep: r.kep,
                  }))}
                  max={4}
                />
              )}
              {s.haladasSzazalek !== undefined && (
                <div className="flex items-center gap-2">
                  <div
                    className="bg-muted h-1.5 w-16 overflow-hidden rounded-full"
                    aria-hidden
                  >
                    <div
                      className="bg-success h-full"
                      style={{ width: `${s.haladasSzazalek}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground truncate text-xs tabular-nums">
                    {s.haladasCimke}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
      {
        key: "hatarido",
        label: "Határidő",
        type: "date",
        sortable: true,
        filterable: true,
        render: (_, s) => {
          if (!s.hatarido)
            return <span className="text-muted-foreground text-xs">—</span>;
          const megj = hataridoMegjegyzes(s.hatarido, ma, s.kesik);
          return (
            <span className="flex flex-col whitespace-nowrap tabular-nums">
              <span className={cn(s.kesik && "text-danger font-medium")}>
                {NAP(s.hatarido)}
              </span>
              {megj && (
                <span
                  className={cn(
                    "text-xs",
                    s.kesik ? "text-danger" : "text-muted-foreground",
                  )}
                >
                  {megj}
                </span>
              )}
            </span>
          );
        },
      },
      {
        key: "sav",
        label: "Esedékesség",
        type: "enum",
        filterable: true,
        defaultVisible: false,
        enumValues: enumOf(HATARIDO_SAV_LABELS, HATARIDO_SAVOK),
        render: (_, s) => HATARIDO_SAV_LABELS[s.sav],
      },
      {
        key: "prioritas",
        label: "Prioritás",
        type: "enum",
        filterable: true,
        enumValues: enumOf(FELADAT_PRIORITAS_LABELS, FELADAT_PRIORITASOK),
        render: (_, s) =>
          s.prioritas === "normal" ? (
            <span className="text-muted-foreground text-xs">Normál</span>
          ) : (
            <Badge variant={FELADAT_PRIORITAS_TONES[s.prioritas]}>
              {FELADAT_PRIORITAS_LABELS[s.prioritas]}
            </Badge>
          ),
      },
      {
        key: "kategoria",
        label: "Kategória",
        searchable: true,
        filterable: true,
        filterVariant: "select",
        enumValues: kategoriak,
        render: (_, s) =>
          s.kategoria ? (
            <span className="bg-muted rounded px-1.5 py-0.5 text-xs">{s.kategoria}</span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
      {
        key: "forras",
        label: "Forrás",
        type: "enum",
        filterable: true,
        defaultVisible: teendoim,
        enumValues: enumOf(TEENDO_KATEGORIA_LABELS, forrasok),
        render: (_, s) => (
          <span className="text-sm">{TEENDO_KATEGORIA_LABELS[s.forras]}</span>
        ),
      },
      {
        key: "felelos",
        label: "Felelős",
        searchable: true,
        filterable: true,
        filterVariant: "select",
        defaultVisible: !teendoim,
        enumValues: nevek("felelos"),
        render: (_, s) => (
          <span className="line-clamp-2 text-sm">{s.felelos || "—"}</span>
        ),
      },
      {
        key: "kiado",
        label: "Kiadó",
        searchable: true,
        filterable: true,
        filterVariant: "select",
        defaultVisible: nezet === "mind" || nezet === "lezart",
        enumValues: nevek("kiado"),
        render: (_, s) => <span className="text-sm">{s.kiado || "—"}</span>,
      },
      {
        key: "createdAt",
        label: "Kiadva",
        type: "date",
        sortable: true,
        defaultVisible: nezet === "lezart",
        render: (_, s) =>
          s.createdAt ? (
            <span className="whitespace-nowrap tabular-nums">
              {NAP(s.createdAt.slice(0, 10))}
            </span>
          ) : (
            "—"
          ),
      },
    ];
  }, [sorok, nezet, ma]);

  return (
    <DataTable<ListaSor>
      mode="client"
      tableId={`feladatok-v2-${nezet}`}
      data={sorok}
      columns={columns}
      query={defaultQuery}
      total={sorok.length}
      basePath="/feladatok"
      rowOpen="navigate"
      rowHref={(s) => s.href}
      emptyMessage={ures}
    />
  );
}
