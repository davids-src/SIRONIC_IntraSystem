"use client";

import { useMemo } from "react";
import { Badge, DataTable, cn, type ColumnDef, type DataTableQuery } from "@erp/ui";
import { NAP } from "@/lib/teendo";

/** One followed flow, flattened for the table (built on the server). */
export type KovetettSor = {
  _id: string;
  href: string;
  tipus: string;
  tipusCimke: string;
  cim: string;
  alcim?: string;
  allapot: string;
  allapotCimke: string;
  allapotTon: "success" | "warning" | "danger" | "info" | "neutral";
  /** `nyitott` / `lezart`. */
  helyzet: "nyitott" | "lezart";
  /** The step running now: "Véleményezés". */
  lepes: string;
  /** "3/5". */
  haladas: string;
  felelos: string;
  /** Current step's deadline, `YYYY-MM-DD` or `''`. */
  hatarido: string;
  kesik: boolean;
  szerep: string;
  frissitve: string;
};

const defaultQuery: DataTableQuery = { page: 1, pageSize: 50 };

const SZEREP_LABELS: Record<string, string> = {
  kerelmezo: "Kértem",
  indito: "Elindítottam",
  felelos: "Felelős vagyok",
  korabbi: "Korábban nálam volt",
  ugyintezo: "Ügyintéző",
};

/**
 * "Követett folyamatok" (#65): every szerződés and ajánlatkérés flow the viewer asked for,
 * started or has a phase in — where each stands, who has it now, by when. A click opens the
 * contract / request page.
 */
export function KovetettFolyamatok({ sorok }: { sorok: KovetettSor[] }) {
  const columns = useMemo<Array<ColumnDef<KovetettSor>>>(() => {
    const allapotok = [
      ...new Map(sorok.map((s) => [s.allapot, s.allapotCimke])).entries(),
    ].map(([value, label]) => ({ value, label }));
    const tipusok = [...new Map(sorok.map((s) => [s.tipus, s.tipusCimke])).entries()].map(
      ([value, label]) => ({ value, label }),
    );
    const felelosok = [...new Set(sorok.map((s) => s.felelos).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "hu"))
      .map((n) => ({ value: n, label: n }));
    return [
      {
        key: "cim",
        label: "Folyamat",
        sortable: true,
        searchable: true,
        hideable: false,
        render: (_, s) => (
          <div className="flex min-w-56 flex-col gap-0.5 py-0.5">
            <span className="font-medium leading-snug">{s.cim}</span>
            {s.alcim && (
              <span className="text-muted-foreground line-clamp-1 text-xs">
                {s.alcim}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "tipus",
        label: "Típus",
        type: "enum",
        filterable: true,
        enumValues: tipusok,
        exportValue: (s) => s.tipusCimke,
        render: (_, s) => <span className="text-sm">{s.tipusCimke}</span>,
      },
      {
        key: "allapot",
        label: "Állapot",
        type: "enum",
        filterable: true,
        enumValues: allapotok,
        exportValue: (s) => s.allapotCimke,
        render: (_, s) => (
          <Badge variant={s.allapotTon} className="whitespace-nowrap">
            {s.allapotCimke}
          </Badge>
        ),
      },
      {
        key: "lepes",
        label: "Most",
        searchable: true,
        render: (_, s) =>
          s.lepes ? (
            <span className="flex flex-col text-sm">
              <span>{s.lepes}</span>
              {s.haladas && (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {s.haladas} lépés kész
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
      {
        key: "felelos",
        label: "Kinél van",
        searchable: true,
        filterable: true,
        filterVariant: "select",
        enumValues: felelosok,
        render: (_, s) => <span className="text-sm">{s.felelos || "—"}</span>,
      },
      {
        key: "hatarido",
        label: "Határidő",
        type: "date",
        sortable: true,
        render: (_, s) =>
          s.hatarido ? (
            <span
              className={cn(
                "whitespace-nowrap tabular-nums",
                s.kesik && "text-danger font-medium",
              )}
            >
              {NAP(s.hatarido)}
              {s.kesik && <span className="block text-xs">lejárt</span>}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          ),
      },
      {
        key: "helyzet",
        label: "Nyitott / lezárt",
        type: "enum",
        filterable: true,
        defaultVisible: false,
        enumValues: [
          { value: "nyitott", label: "Folyamatban" },
          { value: "lezart", label: "Lezárt" },
        ],
        exportValue: (s) => (s.helyzet === "nyitott" ? "Folyamatban" : "Lezárt"),
        render: (_, s) => (s.helyzet === "nyitott" ? "Folyamatban" : "Lezárt"),
      },
      {
        key: "szerep",
        label: "Szerepem",
        defaultVisible: false,
        exportValue: (s) =>
          s.szerep
            .split(",")
            .filter(Boolean)
            .map((k) => SZEREP_LABELS[k] ?? k)
            .join(", "),
        render: (_, s) => (
          <span className="text-muted-foreground text-xs">
            {s.szerep
              .split(",")
              .filter(Boolean)
              .map((k) => SZEREP_LABELS[k] ?? k)
              .join(", ")}
          </span>
        ),
      },
    ];
  }, [sorok]);

  return (
    <DataTable<KovetettSor>
      mode="client"
      tableId="feladatok-folyamatok"
      data={sorok}
      columns={columns}
      query={defaultQuery}
      total={sorok.length}
      basePath="/feladatok"
      rowOpen="navigate"
      rowHref={(s) => s.href}
      exportTitle="Követett folyamatok"
      emptyMessage="Nincs követett folyamat. Itt látod a szerződéseket és ajánlatkéréseket, amiket kértél, elindítottál, vagy amelyeknek egy lépése a tiéd."
    />
  );
}
