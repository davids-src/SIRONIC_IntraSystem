"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button, Input, Label, Textarea } from "@erp/ui";
import {
  AFA_KULCSOK,
  PENZNEMEK,
  SOR_TIPUSOK,
  SOR_TIPUS_LABELS,
  ajanlatOsszesites,
  type AjanlatDetail,
  type AjanlatSor,
} from "@erp/ertekesites/client";
import {
  arSnapshotAction,
  createAjanlatAction,
  updateAjanlatAction,
  type ErtekesitesFormState,
} from "../actions";
import {
  Field,
  FormSection,
  NativeSelect,
} from "@/app/(dashboard)/partner/_components/form-ui";

type ArlistaElem = {
  id: string;
  kod: string;
  nev: string;
  egyseg: string;
  forras: "termek" | "szolgaltatas";
  nettoAr?: number;
};

type SorAllapot = AjanlatSor & { key: string; tetelId?: string };

let seq = 0;
const kulcs = () => `s${seq++}`;
const FT = new Intl.NumberFormat("hu-HU");
const day = (iso?: string) => (iso ? iso.slice(0, 10) : "");

const keziSor = (): SorAllapot => ({
  key: kulcs(),
  forras: "kezi",
  sorTipus: "termek",
  leiras: "",
  mennyiseg: 1,
  egyseg: "db",
  nettoEgysegar: 0,
  afaKulcs: 27,
});

/**
 * The offer wizard (header, partner, lines from árlista / service / manual, discount). The totals
 * preview uses the same pure function the server recalculates with; árlistás prices come from a
 * snapshot fetched through a server action and are frozen into the line.
 */
export function AjanlatForm({
  ajanlat,
  partnerek,
  arlista,
}: {
  ajanlat?: AjanlatDetail;
  partnerek: Array<{ id: string; nev: string }>;
  arlista: ArlistaElem[];
}) {
  const router = useRouter();
  const action = ajanlat
    ? updateAjanlatAction.bind(null, ajanlat.id)
    : createAjanlatAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } as ErtekesitesFormState);
  const [, startTransition] = useTransition();

  const [partnerId, setPartnerId] = useState(ajanlat?.partnerId ?? "");
  const [globKedv, setGlobKedv] = useState(
    ajanlat?.osszegek.globalisKedvezmenySzazalek ?? 0,
  );
  const [sorok, setSorok] = useState<SorAllapot[]>(
    () =>
      ajanlat?.sorok.map((s) => ({
        ...s,
        key: kulcs(),
        tetelId: s.arSnapshot?.tetelId,
      })) ?? [],
  );
  const [kereses, setKereses] = useState("");
  const [foglalt, setFoglalt] = useState(false);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push(`/ertekesites/ajanlatok/${state.id}`);
    } else if (state.message) toast.error(state.message);
  }, [state, router]);

  const osszesites = useMemo(() => ajanlatOsszesites(sorok, globKedv), [sorok, globKedv]);
  const talalatok = useMemo(() => {
    const q = kereses.trim().toLowerCase();
    if (!q) return [];
    return arlista
      .filter((a) => `${a.kod} ${a.nev}`.toLowerCase().includes(q))
      .slice(0, 12);
  }, [kereses, arlista]);

  const err = (name: string) =>
    !state.success ? state.fieldErrors?.[name]?.[0] : undefined;

  const frissit = (key: string, mezok: Partial<SorAllapot>) =>
    setSorok((l) => l.map((s) => (s.key === key ? { ...s, ...mezok } : s)));

  async function arlistabol(elem: ArlistaElem) {
    if (!partnerId) {
      toast.error(
        "Előbb válassz partnert — az árak az ő árazási profilja szerint számolódnak.",
      );
      return;
    }
    setFoglalt(true);
    const r = await arSnapshotAction(elem.id, partnerId);
    setFoglalt(false);
    if (!r.ok) {
      toast.error(r.message);
      return;
    }
    const snap = r.snapshot;
    setSorok((l) => [
      ...l,
      {
        key: kulcs(),
        tetelId: elem.id,
        forras: snap.forras,
        sorTipus: snap.forras === "termek" ? "termek" : "szolgaltatas",
        leiras: snap.nev,
        mennyiseg: 1,
        egyseg: snap.egyseg,
        nettoEgysegar: snap.vegAr,
        afaKulcs: snap.afaKulcs,
        arSnapshot: snap,
      },
    ]);
    setKereses("");
  }

  /** The partner decides the price multiplier: changing it re-freezes every árlistás line. */
  function partnerValtas(uj: string) {
    setPartnerId(uj);
    const erintett = sorok.filter((s) => s.arSnapshot && s.tetelId);
    if (!uj || erintett.length === 0) return;
    startTransition(async () => {
      setFoglalt(true);
      for (const s of erintett) {
        const r = await arSnapshotAction(
          s.tetelId!,
          uj,
          s.arSnapshot?.egysegDb ?? undefined,
        );
        if (r.ok)
          frissit(s.key, {
            arSnapshot: r.snapshot,
            nettoEgysegar: r.snapshot.vegAr,
            afaKulcs: r.snapshot.afaKulcs,
          });
        else toast.error(`${s.leiras}: ${r.message}`);
      }
      setFoglalt(false);
      toast.info("Az árlistás tételek ára az új partner profilja szerint újraszámolva.");
    });
  }

  const kuldendoSorok = sorok.map((s) => {
    const rest = { ...s } as Partial<SorAllapot>;
    delete rest.key;
    delete rest.tetelId;
    return rest;
  });

  return (
    <form action={formAction} className="flex flex-col gap-4 md:gap-5">
      <input type="hidden" name="sorok" value={JSON.stringify(kuldendoSorok)} />
      {state.success === false && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}

      <FormSection title="1. Fejléc és partner" columns={2}>
        <Field
          label="Ajánlat címe"
          htmlFor="cim"
          required
          error={err("cim")}
          className="sm:col-span-2"
        >
          <Input id="cim" name="cim" defaultValue={ajanlat?.cim} />
        </Field>
        <Field label="Partner" htmlFor="partnerId" required error={err("partnerId")}>
          <NativeSelect
            id="partnerId"
            name="partnerId"
            value={partnerId}
            onChange={(e) => partnerValtas(e.target.value)}
            placeholder="Válassz partnert"
            options={partnerek.map((p) => ({ value: p.id, label: p.nev }))}
          />
        </Field>
        <Field label="Pénznem" htmlFor="penznem">
          <NativeSelect
            id="penznem"
            name="penznem"
            defaultValue={ajanlat?.penznem ?? "HUF"}
            options={PENZNEMEK.map((p) => ({ value: p, label: p }))}
          />
        </Field>
        <Field label="Érvényesség" htmlFor="ervenyesseg" error={err("ervenyesseg")}>
          <Input
            id="ervenyesseg"
            name="ervenyesseg"
            type="date"
            defaultValue={day(ajanlat?.ervenyesseg)}
          />
        </Field>
        <Field label="Üzleti egység" htmlFor="uzletiEgyseg">
          <Input
            id="uzletiEgyseg"
            name="uzletiEgyseg"
            defaultValue={ajanlat?.uzletiEgyseg}
          />
        </Field>
        <Field
          label="Megjegyzés (az ajánlaton is megjelenik)"
          htmlFor="megjegyzes"
          className="sm:col-span-2"
        >
          <Textarea
            id="megjegyzes"
            name="megjegyzes"
            rows={3}
            defaultValue={ajanlat?.megjegyzes}
          />
        </Field>
      </FormSection>

      <FormSection
        title="2. Tételek"
        description="Árlistából (a partner árazási profilja szerint befagyasztott ár) vagy kézzel felvett tételek."
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="arlista-kereses">
            Keresés az árlistában (termék, szolgáltatás)
          </Label>
          <Input
            id="arlista-kereses"
            value={kereses}
            onChange={(e) => setKereses(e.target.value)}
            placeholder="Kód vagy név…"
            autoComplete="off"
          />
          {talalatok.length > 0 && (
            <ul className="bg-card divide-y rounded-md border text-sm">
              {talalatok.map((a) => (
                <li key={`${a.forras}-${a.id}`}>
                  <button
                    type="button"
                    disabled={foglalt}
                    onClick={() => arlistabol(a)}
                    className="hover:bg-muted flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                  >
                    <span>
                      <span className="text-muted-foreground mr-2 font-mono text-xs">
                        {a.kod}
                      </span>
                      {a.nev}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {a.forras === "termek" ? "Termék" : "Szolgáltatás"}
                      {a.nettoAr != null ? ` · ${FT.format(a.nettoAr)} Ft` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSorok((l) => [...l, keziSor()])}
            >
              <PlusIcon className="mr-1 size-4" />
              Kézi tétel
            </Button>
          </div>
          {err("sorok") && <p className="text-destructive text-sm">{err("sorok")}</p>}
        </div>

        {sorok.length === 0 ? (
          <p className="text-muted-foreground text-sm">Még nincs tétel.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="p-1">Megnevezés</th>
                  <th className="p-1">Típus</th>
                  <th className="p-1">Menny.</th>
                  <th className="p-1">Egység</th>
                  <th className="p-1">Nettó egységár</th>
                  <th className="p-1">ÁFA</th>
                  <th className="p-1">Kedv. %</th>
                  <th className="p-1 text-right">Nettó összesen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorok.map((s, i) => {
                  const zarolt = Boolean(s.arSnapshot) && !s.arSnapshot?.egyedi;
                  const p = osszesites.sorok[i];
                  return (
                    <tr key={s.key} className="border-t align-top">
                      <td className="p-1">
                        <Input
                          aria-label="Megnevezés"
                          value={s.leiras}
                          onChange={(e) => frissit(s.key, { leiras: e.target.value })}
                        />
                        {s.arSnapshot && (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {s.arSnapshot.kod} · befagyasztott ár (
                            {day(s.arSnapshot.keszult)})
                          </p>
                        )}
                      </td>
                      <td className="p-1">
                        <NativeSelect
                          aria-label="Típus"
                          value={s.sorTipus}
                          disabled={s.forras === "termek"}
                          onChange={(e) =>
                            frissit(s.key, {
                              sorTipus: e.target.value as AjanlatSor["sorTipus"],
                            })
                          }
                          options={SOR_TIPUSOK.map((t) => ({
                            value: t,
                            label: SOR_TIPUS_LABELS[t],
                          }))}
                        />
                      </td>
                      <td className="w-20 p-1">
                        <Input
                          aria-label="Mennyiség"
                          type="number"
                          min="0"
                          step="any"
                          value={s.mennyiseg}
                          onChange={(e) =>
                            frissit(s.key, { mennyiseg: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="w-20 p-1">
                        <Input
                          aria-label="Egység"
                          value={s.egyseg}
                          onChange={(e) => frissit(s.key, { egyseg: e.target.value })}
                        />
                      </td>
                      <td className="w-32 p-1">
                        <Input
                          aria-label="Nettó egységár"
                          type="number"
                          min="0"
                          step="any"
                          value={s.nettoEgysegar}
                          readOnly={zarolt}
                          onChange={(e) =>
                            frissit(s.key, { nettoEgysegar: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="w-24 p-1">
                        <NativeSelect
                          aria-label="ÁFA"
                          value={String(s.afaKulcs)}
                          disabled={Boolean(s.arSnapshot)}
                          onChange={(e) =>
                            frissit(s.key, { afaKulcs: Number(e.target.value) })
                          }
                          options={AFA_KULCSOK.map((k) => ({
                            value: String(k),
                            label: `${k}%`,
                          }))}
                        />
                      </td>
                      <td className="w-20 p-1">
                        <Input
                          aria-label="Kedvezmény százalék"
                          type="number"
                          min="0"
                          max="100"
                          value={s.kedvezmenySzazalek ?? 0}
                          onChange={(e) =>
                            frissit(s.key, { kedvezmenySzazalek: Number(e.target.value) })
                          }
                        />
                      </td>
                      <td className="p-1 text-right whitespace-nowrap">
                        {FT.format(Math.round(p?.nettoKedvezmeny ?? 0))} Ft
                      </td>
                      <td className="p-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Tétel törlése"
                          onClick={() =>
                            setSorok((l) => l.filter((x) => x.key !== s.key))
                          }
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>

      <FormSection title="3. Kedvezmény és végösszeg" columns={2}>
        <Field
          label="Globális kedvezmény (%)"
          htmlFor="globalisKedvezmenySzazalek"
          error={err("globalisKedvezmenySzazalek")}
        >
          <Input
            id="globalisKedvezmenySzazalek"
            name="globalisKedvezmenySzazalek"
            type="number"
            min="0"
            max="100"
            step="any"
            value={globKedv}
            onChange={(e) => setGlobKedv(Number(e.target.value))}
          />
        </Field>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Nettó összesen</dt>
          <dd className="text-right">{FT.format(osszesites.nettoOsszeg)} Ft</dd>
          {osszesites.globalisKedvezmenyOsszeg > 0 && (
            <>
              <dt className="text-muted-foreground">Kedvezmény</dt>
              <dd className="text-right">
                -{FT.format(osszesites.globalisKedvezmenyOsszeg)} Ft
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">ÁFA</dt>
          <dd className="text-right">{FT.format(osszesites.afaOsszeg)} Ft</dd>
          <dt className="font-semibold">Bruttó végösszeg</dt>
          <dd className="text-right font-semibold">
            {FT.format(osszesites.bruttoOsszeg)} Ft
          </dd>
        </dl>
        <p className="text-muted-foreground text-xs sm:col-span-2">
          Az előnézet tájékoztató: mentéskor a szerver újraszámolja az összegeket.
        </p>
      </FormSection>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || foglalt}>
          {ajanlat ? "Ajánlat mentése" : "Ajánlat létrehozása"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
