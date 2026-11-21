"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { Badge, Input, cn } from "@erp/ui";
import {
  ALVALLALKOZOI_JELENLET_LABELS,
  ALVALLALKOZOI_JELENLET_TIPUSOK,
  ARAZASI_TIPUS_LABELS,
  ARAZASI_TIPUS_TONES,
  PARTNER_SZEREPEK,
  PARTNER_SZEREP_LABELS,
  SURGOSSEG_KULCSOK,
  SURGOSSEG_LABELS,
  SZERZODES_TIPUSOK,
  SZERZODES_TIPUS_LABELS,
  UGYFEL_KATEGORIAK,
  UGYFEL_KATEGORIA_LABELS,
  UGYFEL_SZORZO_KULCSOK,
  UGYFEL_SZORZO_LABELS,
  arMatrixSor,
  calculateServicePrice,
  calculateServicePriceForPartner,
  type AlvallalkozoiJelenlet,
  type ArazasiBeallitasok,
  type KategoriaDto,
  type PartnerArazasiProfil,
  type PartnerSzerep,
  type SurgossegKulcs,
  type SzerzodesTipus,
  type SzolgaltatasDto,
  type UgyfelKategoria,
} from "@erp/arlista/client";

const FT = new Intl.NumberFormat("hu-HU");
const ar = (n: number, egyedi = false) => (egyedi ? "Egyedi ajánlat" : `${FT.format(n)} Ft`);
const SELECT = "border-input bg-background h-9 rounded-md border px-2 text-sm";

/** Units shown in the matrix for tiered items: the first tier's lower bound. */
const peldaEgyseg = (t: SzolgaltatasDto) => t.egysegSavok[0]?.minEgyseg ?? 0;

function BreakdownKartya({
  tetel,
  beallitasok,
  profil,
  surgosseg,
}: {
  tetel: SzolgaltatasDto;
  beallitasok: ArazasiBeallitasok;
  profil: PartnerArazasiProfil;
  surgosseg: SurgossegKulcs | "";
}) {
  const egysegDb = peldaEgyseg(tetel);
  const partner = calculateServicePriceForPartner(tetel, profil, beallitasok, {
    surgosseg: surgosseg || null,
    egysegDb,
  });
  const alap = calculateServicePrice(tetel, "kkv_1_eves", beallitasok, { egysegDb });
  return (
    <div className="bg-muted/30 grid gap-4 rounded-lg border p-4 md:grid-cols-2">
      <div className="flex flex-col gap-2 text-sm">
        <h4 className="font-semibold">Árbontás</h4>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">Árazás típusa</dt>
          <dd>{ARAZASI_TIPUS_LABELS[tetel.arazasiTipus]}</dd>
          <dt className="text-muted-foreground">Belső alapár</dt>
          <dd className="tabular-nums">{ar(alap.belsoAlapar, alap.egyedi)}</dd>
          <dt className="text-muted-foreground">Egység</dt>
          <dd>{tetel.egyseg}</dd>
          {tetel.arazasiTipus === "oradij" && (
            <>
              <dt className="text-muted-foreground">Rezsi szorzó</dt>
              <dd className="tabular-nums">× {beallitasok.rezsiSzorzo}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Kiválasztott partner</dt>
          <dd>
            {UGYFEL_SZORZO_LABELS[partner.szorzoKulcs]} (× {partner.ugyfelSzorzo})
          </dd>
          <dt className="text-muted-foreground">Partner ára</dt>
          <dd className="font-semibold tabular-nums">{ar(partner.kalkulaltAr, partner.egyedi)}</dd>
          {surgosseg && !partner.egyedi && (
            <>
              <dt className="text-muted-foreground">
                {SURGOSSEG_LABELS[surgosseg]} (× {partner.surgossegiSzorzo})
              </dt>
              <dd className="font-semibold tabular-nums">{ar(partner.vegAr)}</dd>
            </>
          )}
        </dl>
        {tetel.egysegSavok.length > 0 && (
          <div>
            <h5 className="mt-2 font-medium">Sávok</h5>
            <ul className="text-muted-foreground text-xs">
              {tetel.egysegSavok.map((s) => (
                <li key={s.cimke}>
                  {s.cimke}: {s.minEgyseg}–{s.maxEgyseg ?? "∞"} {tetel.egyseg} — {ar(s.alapar)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {tetel.ugyfelMegjegyzes && (
          <p className="text-muted-foreground text-xs">Ügyfél felé: {tetel.ugyfelMegjegyzes}</p>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold">Minden ügyfélkategória</h4>
        <table className="w-full text-sm">
          <tbody>
            {UGYFEL_SZORZO_KULCSOK.map((k) => {
              const r = calculateServicePrice(tetel, k, beallitasok, { egysegDb });
              return (
                <tr key={k} className={cn("border-b", k === partner.szorzoKulcs && "bg-primary/10")}>
                  <td className="py-1">{UGYFEL_SZORZO_LABELS[k]}</td>
                  <td className="text-muted-foreground text-right tabular-nums">× {r.ugyfelSzorzo}</td>
                  <td className="text-right font-medium tabular-nums">{ar(r.kalkulaltAr, r.egyedi)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SzolgaltatasArlista({
  kategoriak,
  tetelek,
  beallitasok,
  canWrite,
}: {
  kategoriak: KategoriaDto[];
  tetelek: SzolgaltatasDto[];
  beallitasok: ArazasiBeallitasok;
  canWrite: boolean;
}) {
  const [nezet, setNezet] = useState<"fa" | "matrix">("fa");
  const [kereses, setKereses] = useState("");
  const [kategoriaSzuro, setKategoriaSzuro] = useState("");
  const [nyitott, setNyitott] = useState<Set<string>>(new Set());
  const [zart, setZart] = useState<Set<string>>(new Set());
  const [szerep, setSzerep] = useState<PartnerSzerep | "">("");
  const [ugyfelKategoria, setUgyfelKategoria] = useState<UgyfelKategoria | "">("kkv");
  const [szerzodes, setSzerzodes] = useState<SzerzodesTipus | "">("1_eves");
  const [jelenlet, setJelenlet] = useState<AlvallalkozoiJelenlet | "">("");
  const [surgosseg, setSurgosseg] = useState<SurgossegKulcs | "">("");

  const profil: PartnerArazasiProfil = {
    szerep: szerep || null,
    ugyfelKategoria: ugyfelKategoria || null,
    szerzodesTipus: szerzodes || null,
    alvallalkozoiJelenlet: jelenlet || null,
  };

  const szurt = useMemo(() => {
    const q = kereses.trim().toLowerCase();
    return tetelek.filter(
      (t) =>
        (!kategoriaSzuro || t.kategoriaId === kategoriaSzuro) &&
        (!q || t.nev.toLowerCase().includes(q) || t.kod.toLowerCase().includes(q)),
    );
  }, [tetelek, kereses, kategoriaSzuro]);

  const csoportok = useMemo(
    () =>
      kategoriak
        .map((k) => ({ kategoria: k, tetelek: szurt.filter((t) => t.kategoriaId === k._id) }))
        .filter((c) => c.tetelek.length > 0),
    [kategoriak, szurt],
  );

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const uj = new Set(set);
    if (uj.has(id)) uj.delete(id);
    else uj.add(id);
    setter(uj);
  };

  const partnerAr = (t: SzolgaltatasDto) =>
    calculateServicePriceForPartner(t, profil, beallitasok, {
      surgosseg: surgosseg || null,
      egysegDb: peldaEgyseg(t),
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          placeholder="Keresés névre vagy kódra"
          value={kereses}
          onChange={(e) => setKereses(e.target.value)}
          className="w-64"
        />
        <select
          className={SELECT}
          value={kategoriaSzuro}
          onChange={(e) => setKategoriaSzuro(e.target.value)}
          aria-label="Kategória"
        >
          <option value="">Minden kategória</option>
          {kategoriak.map((k) => (
            <option key={k._id} value={k._id}>
              {k.nev}
            </option>
          ))}
        </select>
        <div className="ml-auto inline-flex rounded-md border">
          {(["fa", "matrix"] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNezet(n)}
              className={cn(
                "px-3 py-1.5 text-sm",
                nezet === n ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {n === "fa" ? "Fa nézet" : "Mátrix nézet"}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="bg-muted/30 flex flex-wrap items-end gap-3 rounded-lg border p-3">
        <legend className="px-1 text-xs font-medium">Partner árazási profilja (extra oszlop)</legend>
        <select className={SELECT} value={szerep} onChange={(e) => setSzerep(e.target.value as PartnerSzerep | "")} aria-label="Partner szerepe">
          <option value="">Szerep…</option>
          {PARTNER_SZEREPEK.map((s) => (
            <option key={s} value={s}>
              {PARTNER_SZEREP_LABELS[s]}
            </option>
          ))}
        </select>
        <select className={SELECT} value={ugyfelKategoria} onChange={(e) => setUgyfelKategoria(e.target.value as UgyfelKategoria | "")} aria-label="Ügyfélkategória">
          <option value="">Ügyfélkategória…</option>
          {UGYFEL_KATEGORIAK.map((s) => (
            <option key={s} value={s}>
              {UGYFEL_KATEGORIA_LABELS[s]}
            </option>
          ))}
        </select>
        <select className={SELECT} value={szerzodes} onChange={(e) => setSzerzodes(e.target.value as SzerzodesTipus | "")} aria-label="Szerződés típusa">
          <option value="">Szerződés…</option>
          {SZERZODES_TIPUSOK.map((s) => (
            <option key={s} value={s}>
              {SZERZODES_TIPUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select className={SELECT} value={jelenlet} onChange={(e) => setJelenlet(e.target.value as AlvallalkozoiJelenlet | "")} aria-label="Alvállalkozói jelenlét">
          <option value="">Alvállalkozói jelenlét…</option>
          {ALVALLALKOZOI_JELENLET_TIPUSOK.map((s) => (
            <option key={s} value={s}>
              {ALVALLALKOZOI_JELENLET_LABELS[s]}
            </option>
          ))}
        </select>
        <select className={SELECT} value={surgosseg} onChange={(e) => setSurgosseg(e.target.value as SurgossegKulcs | "")} aria-label="Sürgősség">
          <option value="">Sürgősség nélkül</option>
          {SURGOSSEG_KULCSOK.map((s) => (
            <option key={s} value={s}>
              {SURGOSSEG_LABELS[s]} (× {beallitasok.surgossegiSzorzok[s]})
            </option>
          ))}
        </select>
      </fieldset>

      {csoportok.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">Nincs találat.</p>
      )}

      {nezet === "fa" && (
        <div className="flex flex-col gap-4">
          {csoportok.map(({ kategoria, tetelek: sorok }) => {
            const osszecsukva = zart.has(kategoria._id);
            const alcsoportok = [
              ...kategoria.alkategoriak.map((a) => ({
                kulcs: a._id,
                nev: a.nev,
                sorok: sorok.filter((t) => t.alkategoriaId === a._id),
              })),
              { kulcs: "-", nev: "", sorok: sorok.filter((t) => !t.alkategoriaId) },
            ].filter((a) => a.sorok.length > 0);
            return (
              <section key={kategoria._id} className="bg-card overflow-hidden rounded-xl border">
                <button
                  type="button"
                  onClick={() => toggle(zart, setZart, kategoria._id)}
                  className="bg-muted/40 flex w-full items-center gap-2 border-b px-4 py-2 text-left"
                  aria-expanded={!osszecsukva}
                >
                  {osszecsukva ? <ChevronRightIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                  <span className="size-3 rounded-full" style={{ backgroundColor: kategoria.szin }} />
                  <span className="font-semibold">{kategoria.nev}</span>
                  <span className="text-muted-foreground text-xs">
                    {kategoria.kodElotag} · {sorok.length} tétel
                  </span>
                </button>
                {!osszecsukva && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b text-left text-xs">
                        <th className="w-8" />
                        <th className="px-2 py-2">Kód</th>
                        <th>Megnevezés</th>
                        <th>Árazás</th>
                        <th>Egység</th>
                        <th className="text-right">Belső alapár</th>
                        <th className="px-3 text-right">Partner ára</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alcsoportok.map((a) => (
                        <Fragment key={a.kulcs}>
                          {a.nev && (
                            <tr>
                              <td colSpan={7} className="bg-muted/20 px-4 py-1 text-xs font-semibold">
                                {a.nev}
                              </td>
                            </tr>
                          )}
                          {a.sorok.map((t) => {
                            const p = partnerAr(t);
                            const nyitva = nyitott.has(t._id);
                            return (
                              <Fragment key={t._id}>
                                <tr className="hover:bg-muted/30 border-b">
                                  <td className="pl-2">
                                    <button
                                      type="button"
                                      aria-label="Árbontás"
                                      aria-expanded={nyitva}
                                      onClick={() => toggle(nyitott, setNyitott, t._id)}
                                    >
                                      {nyitva ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
                                    </button>
                                  </td>
                                  <td className="px-2 py-2 font-mono text-xs">{t.kod}</td>
                                  <td>
                                    {canWrite ? (
                                      <Link href={`/arlista/szolgaltatasok/${t._id}`} className="underline-offset-2 hover:underline">
                                        {t.nev}
                                      </Link>
                                    ) : (
                                      t.nev
                                    )}
                                  </td>
                                  <td>
                                    <Badge variant={ARAZASI_TIPUS_TONES[t.arazasiTipus]}>
                                      {ARAZASI_TIPUS_LABELS[t.arazasiTipus]}
                                    </Badge>
                                  </td>
                                  <td>{t.egyseg}</td>
                                  <td className="text-right tabular-nums">
                                    {t.arazasiTipus === "egyedi"
                                      ? "—"
                                      : ar(calculateServicePrice(t, "kkv_1_eves", beallitasok, { egysegDb: peldaEgyseg(t) }).belsoAlapar)}
                                  </td>
                                  <td className="px-3 text-right font-medium tabular-nums">
                                    {ar(p.vegAr, p.egyedi)}
                                  </td>
                                </tr>
                                {nyitva && (
                                  <tr>
                                    <td colSpan={7} className="p-3">
                                      <BreakdownKartya tetel={t} beallitasok={beallitasok} profil={profil} surgosseg={surgosseg} />
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
        </div>
      )}

      {nezet === "matrix" && csoportok.length > 0 && (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs">
                <th className="px-3 py-2">Kód</th>
                <th>Megnevezés</th>
                <th className="text-right">Belső alapár</th>
                {UGYFEL_SZORZO_KULCSOK.map((k) => (
                  <th key={k} className="px-2 text-right whitespace-nowrap">
                    {UGYFEL_SZORZO_LABELS[k]}
                    <div className="text-muted-foreground font-normal">× {beallitasok.ugyfelSzorzok[k]}</div>
                  </th>
                ))}
                <th className="px-2 text-right whitespace-nowrap">Kiválasztott partner</th>
              </tr>
            </thead>
            <tbody>
              {csoportok.map(({ kategoria, tetelek: sorok }) => (
                <Fragment key={kategoria._id}>
                  <tr>
                    <td colSpan={UGYFEL_SZORZO_KULCSOK.length + 4} className="bg-muted/20 px-3 py-1 text-xs font-semibold">
                      {kategoria.nev}
                    </td>
                  </tr>
                  {sorok.map((t) => {
                    const sor = arMatrixSor(t, beallitasok, peldaEgyseg(t));
                    const p = partnerAr(t);
                    const egyedi = t.arazasiTipus === "egyedi";
                    return (
                      <tr key={t._id} className="border-b">
                        <td className="px-3 py-1.5 font-mono text-xs">{t.kod}</td>
                        <td>{t.nev}</td>
                        <td className="text-right tabular-nums">
                          {egyedi ? "—" : FT.format(p.belsoAlapar)}
                        </td>
                        {UGYFEL_SZORZO_KULCSOK.map((k) => (
                          <td
                            key={k}
                            className={cn("px-2 text-right tabular-nums", k === p.szorzoKulcs && "bg-primary/10 font-medium")}
                          >
                            {egyedi ? "—" : FT.format(sor[k])}
                          </td>
                        ))}
                        <td className="px-2 text-right font-semibold tabular-nums">{ar(p.vegAr, p.egyedi)}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        Az árak a böngészőben, a beállított szorzókból számolódnak (100 Ft-ra kerekítve, ÁFA nélkül).
        Dokumentumba kerüléskor a szerver befagyasztott árat (snapshot) készít.
      </p>
    </div>
  );
}
