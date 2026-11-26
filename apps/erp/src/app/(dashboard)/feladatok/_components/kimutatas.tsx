"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { Badge, Input, cn } from "@erp/ui";
import {
  FELADAT_ALLAPOT_LABELS,
  FELADAT_ALLAPOT_TONES,
  FELADAT_PRIORITAS_LABELS,
  FELADAT_PRIORITAS_TONES,
} from "@erp/feladat/client";
import type { FeladatKimutatas, FeladatKimutatasSor } from "@erp/feladat";
import type { FeladatCsoportositas, FeladatCsoportStat } from "@erp/feladat/client";
import { NAP } from "@/lib/teendo";

const IDOSZAKOK = [
  { napok: 30, label: "30 nap" },
  { napok: 90, label: "90 nap" },
  { napok: 365, label: "1 év" },
  { napok: 0, label: "Mind" },
];

type Rendezes = "elakadt" | "lejart" | "kapott" | "nyitott" | "arany" | "nev";

const szazalek = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/**
 * Feladatok → Kimutatás: who gets how many tasks from whom, how much they finish (on time),
 * where things are stuck. Colours: red overdue, amber stuck, green done.
 */
export function Kimutatas({ adat, napok }: { adat: FeladatKimutatas; napok: number }) {
  const [kereso, setKereso] = useState("");
  const [rendezes, setRendezes] = useState<Rendezes>("elakadt");
  const [nyitott, setNyitott] = useState<string | null>(null);

  const sorok = useMemo(() => {
    const q = kereso.trim().toLowerCase();
    const nyitottDb = (s: FeladatKimutatasSor) => s.elfogadasraVar + s.folyamatban;
    const kulcs: Record<Rendezes, (s: FeladatKimutatasSor) => number | string> = {
      elakadt: (s) => -s.elakadt * 1000 - s.lejart,
      lejart: (s) => -s.lejart,
      kapott: (s) => -s.kapott,
      nyitott: (s) => -nyitottDb(s),
      arany: (s) => szazalek(s.kesz, s.kapott - s.visszavont - s.tovabbadott),
      nev: (s) => s.nev,
    };
    return adat.sorok
      .filter((s) => !q || s.nev.toLowerCase().includes(q))
      .sort((a, b) => {
        const x = kulcs[rendezes](a);
        const y = kulcs[rendezes](b);
        return typeof x === "string"
          ? x.localeCompare(String(y), "hu")
          : x - (y as number) || a.nev.localeCompare(b.nev, "hu");
      });
  }, [adat.sorok, kereso, rendezes]);

  const th = (r: Rendezes, label: string, className = "text-right") => (
    <th className={cn("px-3 py-2", className)}>
      <button
        type="button"
        onClick={() => setRendezes(r)}
        className={cn(
          "hover:underline",
          rendezes === r && "text-foreground font-semibold",
        )}
      >
        {label}
        {rendezes === r ? " ↓" : ""}
      </button>
    </th>
  );

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-1.5" aria-label="Időszak">
        {IDOSZAKOK.map((i) => (
          <Link
            key={i.napok}
            href={`/feladatok?nezet=kimutatas&napok=${i.napok}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              i.napok === napok
                ? "bg-foreground text-background"
                : "bg-muted hover:bg-accent",
            )}
          >
            {i.label}
          </Link>
        ))}
        <span className="text-muted-foreground self-center text-xs">
          — a kiadás ideje szerint; a még nyitottak mindig számítanak. Saját feladatok
          nélkül. A „Kiadott feladat” egy csoportos feladatot egyszer számol, minden más
          szám (és a táblázat) példányonként: a csoportos feladat minden résztvevőnél
          egy-egy feladat.
        </span>
      </nav>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Csempe
          cimke="Kiadott feladat"
          ertek={adat.feladatok.osszes}
          sugo={
            adat.feladatok.csoportos
              ? `ebből ${adat.feladatok.csoportos} csoportos (${adat.feladatok.csoportosKesz} teljesen kész) · összesen ${adat.osszes} példány`
              : `${adat.osszes} példány`
          }
        />
        <Csempe
          cimke="Nyitott példány"
          ertek={adat.nyitott}
          sugo="Csoportos feladatnál résztvevőnként számít"
        />
        <Csempe
          cimke="Lejárt"
          ertek={adat.lejart}
          szin={adat.lejart ? "bg-danger-soft border-danger-border" : undefined}
        />
        <Csempe
          cimke="Elakadt"
          ertek={adat.elakadt}
          szin={adat.elakadt ? "bg-warning-soft border-warning-border" : undefined}
          sugo="Lejárt, vagy 3 napnál régebben vár elfogadásra"
        />
        <Csempe
          cimke="Határidőre kész"
          ertek={`${szazalek(adat.hataridoreKesz, adat.kesz)}%`}
          szin="bg-success-soft border-success-border"
          sugo={`${adat.hataridoreKesz} / ${adat.kesz} kész feladat`}
        />
        <Csempe
          cimke="Átlagos átfutás"
          ertek={adat.atlagNap !== undefined ? `${adat.atlagNap} nap` : "—"}
          sugo="Kiadástól a lezárásig, a kész feladatokon"
        />
      </div>

      <CsoportStatok csoportok={adat.csoportok} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <SearchIcon className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
          <Input
            value={kereso}
            onChange={(e) => setKereso(e.target.value)}
            placeholder="Munkatárs keresése…"
            className="pl-8"
            aria-label="Munkatárs keresése"
          />
        </div>
        <span className="text-muted-foreground text-xs">
          Kattints egy sorra: kitől kapta, és mi van még nyitva nála.
        </span>
      </div>

      {sorok.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nincs adat ebben az időszakban.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs">
              <tr>
                {th("nev", "Munkatárs", "text-left")}
                {th("kapott", "Kapott")}
                {th("nyitott", "Nyitott")}
                {th("lejart", "Lejárt")}
                {th("elakadt", "Elakadt")}
                <th className="px-3 py-2 text-right">Elutasított</th>
                <th
                  className="px-3 py-2 text-right"
                  title="Továbbadta másnak vagy vissza a kiadónak"
                >
                  Továbbadott
                </th>
                {th("arany", "Kész", "text-left")}
                <th className="px-3 py-2 text-right">Átfutás</th>
                <th className="px-3 py-2 text-right">Saját</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorok.map((s) => {
                const alap = s.kapott - s.visszavont - s.tovabbadott;
                const arany = szazalek(s.kesz, alap);
                const ki = nyitott === s.userId;
                return (
                  <Fragment key={s.userId}>
                    <tr
                      className={cn(
                        "hover:bg-muted/40 cursor-pointer",
                        ki && "bg-muted/40",
                      )}
                      onClick={() => setNyitott(ki ? null : s.userId)}
                    >
                      <td className="px-3 py-2 font-medium">
                        <span className="inline-flex items-center gap-1">
                          {ki ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                          {s.nev}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.kapott}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.elfogadasraVar + s.folyamatban}
                        {s.elfogadasraVar > 0 && (
                          <span className="text-muted-foreground text-xs">
                            {" "}
                            ({s.elfogadasraVar} új)
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums",
                          s.lejart && "text-danger font-semibold",
                        )}
                      >
                        {s.lejart || "—"}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums",
                          s.elakadt && "text-warning font-semibold",
                        )}
                      >
                        {s.elakadt || "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.elutasitott || "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.tovabbadott || "—"}
                      </td>
                      <td className="min-w-40 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                arany >= 80
                                  ? "bg-success"
                                  : arany >= 50
                                    ? "bg-warning"
                                    : "bg-danger",
                              )}
                              style={{ width: `${arany}%` }}
                            />
                          </div>
                          <span className="w-20 text-xs tabular-nums">
                            {s.kesz}/{alap} · {arany}%
                          </span>
                        </div>
                        {s.kesz > 0 && (
                          <p className="text-muted-foreground text-[10px]">
                            határidőre: {szazalek(s.hataridoreKesz, s.kesz)}%
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums">
                        {s.atlagNap !== undefined ? `${s.atlagNap} nap` : "—"}
                      </td>
                      <td className="text-muted-foreground px-3 py-2 text-right text-xs tabular-nums">
                        {s.sajat ? `${s.sajatKesz}/${s.sajat}` : "—"}
                      </td>
                    </tr>
                    {ki && (
                      <tr>
                        <td colSpan={10} className="bg-muted/20 px-4 py-3">
                          <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
                            <div>
                              {s.kozremukodo > 0 && (
                                <p className="text-muted-foreground mb-2 text-xs">
                                  Csoportos feladatokban {s.kozremukodo}× közreműködő (nem
                                  elsődleges felelős).
                                </p>
                              )}
                              <p className="mb-1 text-xs font-semibold">Kitől kapta</p>
                              <ul className="flex flex-col gap-1 text-xs">
                                {s.kiadok.map((k) => (
                                  <li key={k.nev} className="flex justify-between gap-2">
                                    <span>{k.nev}</span>
                                    <span className="tabular-nums">
                                      {k.db} db · {k.kesz} kész
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold">
                                Nyitott feladatai ({s.nyitottak.length})
                              </p>
                              {s.nyitottak.length === 0 ? (
                                <p className="text-muted-foreground text-xs">
                                  Nincs nyitott feladata.
                                </p>
                              ) : (
                                <ul className="flex flex-col gap-1">
                                  {s.nyitottak.map((n) => (
                                    <li
                                      key={n.id}
                                      className="bg-card flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1 text-xs"
                                    >
                                      <span className="min-w-0 flex-1 truncate">
                                        <Link
                                          href={`/feladatok/${n.id}`}
                                          className="font-medium hover:underline"
                                        >
                                          {n.cim}
                                        </Link>
                                        <span className="text-muted-foreground">
                                          {" "}
                                          — {n.kiadoNev} adta, {n.nap} napja
                                        </span>
                                      </span>
                                      <span className="flex items-center gap-1.5">
                                        {n.elakadt && !n.kesik && (
                                          <Badge variant="warning">Elakadt</Badge>
                                        )}
                                        {n.prioritas !== "normal" && (
                                          <Badge
                                            variant={FELADAT_PRIORITAS_TONES[n.prioritas]}
                                          >
                                            {FELADAT_PRIORITAS_LABELS[n.prioritas]}
                                          </Badge>
                                        )}
                                        {n.elsodleges !== undefined && (
                                          <Badge variant="outline">
                                            {n.elsodleges ? "Elsődleges" : "Közreműködő"}
                                          </Badge>
                                        )}
                                        <Badge variant={FELADAT_ALLAPOT_TONES[n.allapot]}>
                                          {FELADAT_ALLAPOT_LABELS[n.allapot]}
                                        </Badge>
                                        <span
                                          className={cn(
                                            "tabular-nums",
                                            n.kesik && "text-danger font-semibold",
                                          )}
                                        >
                                          {NAP(n.hatarido)}
                                        </span>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {adat.kiadok.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Kiadók</h2>
          <div className="flex flex-wrap gap-2">
            {adat.kiadok.map((k) => (
              <div key={k.nev} className="rounded-md border px-3 py-2 text-xs">
                <p className="font-medium">{k.nev}</p>
                <p className="text-muted-foreground tabular-nums">
                  {k.feladat} feladat
                  {k.kiadott !== k.feladat ? ` (${k.kiadott} példány)` : ""} · {k.kesz}{" "}
                  kész
                  {k.lejart ? (
                    <span className="text-danger"> · {k.lejart} lejárt</span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Csempe({
  cimke,
  ertek,
  szin,
  sugo,
}: {
  cimke: string;
  ertek: number | string;
  szin?: string;
  sugo?: string;
}) {
  return (
    <div className={cn("rounded-lg border p-3", szin ?? "bg-card")} title={sugo}>
      <p className="text-xs font-medium opacity-80">{cimke}</p>
      <p className="text-2xl font-bold tabular-nums">{ertek}</p>
      {sugo && <p className="text-[10px] opacity-70">{sugo}</p>}
    </div>
  );
}

const CSOPORTOSITASOK: Record<FeladatCsoportositas, string> = {
  kategoria: "Kategória",
  felelos: "Felelős",
  kiado: "Kiadó",
};

/**
 * Stats per group (#65): by kategória (default), felelős or kiadó — how many tasks, how many
 * open / overdue / done, the on-time rate and the average lead time. Per copy, like the tiles.
 */
function CsoportStatok({
  csoportok,
}: {
  csoportok: Record<FeladatCsoportositas, FeladatCsoportStat[]>;
}) {
  const [szerint, setSzerint] = useState<FeladatCsoportositas>("kategoria");
  const sorok = csoportok[szerint];
  const max = Math.max(1, ...sorok.map((s) => s.osszes));
  return (
    <section
      className="bg-card flex flex-col gap-3 rounded-lg border p-4"
      aria-labelledby="csoportok"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="csoportok" className="text-sm font-semibold">
          Csoportonként
        </h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Csoportosítás">
          {(Object.keys(CSOPORTOSITASOK) as FeladatCsoportositas[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSzerint(k)}
              aria-pressed={k === szerint}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                k === szerint
                  ? "bg-foreground text-background"
                  : "bg-muted hover:bg-accent",
              )}
            >
              {CSOPORTOSITASOK[k]}
            </button>
          ))}
        </div>
      </div>
      {sorok.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nincs feladat az időszakban.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs">
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium">
                  {CSOPORTOSITASOK[szerint]}
                </th>
                <th className="px-3 py-2 text-right font-medium">Összes</th>
                <th className="px-3 py-2 text-right font-medium">Nyitott</th>
                <th className="px-3 py-2 text-right font-medium">Lejárt</th>
                <th className="px-3 py-2 text-right font-medium">Kész</th>
                <th className="px-3 py-2 text-right font-medium">Határidőre</th>
                <th className="px-3 py-2 text-right font-medium">Átlag átfutás</th>
                <th className="hidden px-3 py-2 font-medium md:table-cell">
                  <span className="sr-only">Arány</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorok.map((s) => (
                <tr key={s.nev} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-medium">{s.nev}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.osszes}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.nyitott}</td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right tabular-nums",
                      s.lejart > 0 && "text-danger font-medium",
                    )}
                  >
                    {s.lejart}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.kesz}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {s.hataridoreSzazalek !== undefined
                      ? `${s.hataridoreSzazalek}%`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {s.atlagNap !== undefined ? `${s.atlagNap} nap` : "—"}
                  </td>
                  <td className="hidden w-40 px-3 py-2 md:table-cell">
                    <span
                      className="bg-muted flex h-2 overflow-hidden rounded-full"
                      title={`${s.kesz} kész, ${s.nyitott} nyitott a(z) ${s.osszes}-ból`}
                    >
                      <span
                        className="bg-success"
                        style={{ width: `${(s.kesz / max) * 100}%` }}
                      />
                      <span
                        className="bg-info"
                        style={{ width: `${((s.nyitott - s.lejart) / max) * 100}%` }}
                      />
                      <span
                        className="bg-danger"
                        style={{ width: `${(s.lejart / max) * 100}%` }}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
