"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button, Input, Label, Textarea } from "@erp/ui";
import {
  MUNKALAP_SOR_TIPUSOK,
  MUNKALAP_SOR_TIPUS_LABELS,
  munkalapOsszesites,
  type MunkalapDetail,
  type MunkalapSor,
} from "@erp/szerviz/client";
import {
  createMunkalapAction,
  munkalapArSnapshotAction,
  updateMunkalapAction,
  type SzervizFormState,
} from "../actions";
import { AlairasPad } from "./alairas-pad";
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
type SorAllapot = MunkalapSor & { key: string };

let seq = 0;
const FT = new Intl.NumberFormat("hu-HU");
const nap = (iso?: string) => (iso ? iso.slice(0, 10) : "");

export function MunkalapForm({
  munkalap,
  elozetes,
  partnerek,
  arlista,
  projektek,
  hibajegyek,
  szereloNev,
}: {
  munkalap?: MunkalapDetail;
  /** Prefill when started from a ticket. */
  elozetes?: { hibajegyId?: string; partnerId?: string };
  partnerek: Array<{ id: string; nev: string }>;
  arlista: ArlistaElem[];
  projektek: Array<{ id: string; azonosito: string; nev: string }>;
  hibajegyek: Array<{ id: string; azonosito: string; targy: string }>;
  szereloNev: string;
}) {
  const router = useRouter();
  const action = munkalap
    ? updateMunkalapAction.bind(null, munkalap.id)
    : createMunkalapAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } as SzervizFormState);
  const [partnerId, setPartnerId] = useState(
    munkalap?.partnerId ?? elozetes?.partnerId ?? "",
  );
  const [sorok, setSorok] = useState<SorAllapot[]>(
    () => munkalap?.sorok.map((s) => ({ ...s, key: `s${seq++}` })) ?? [],
  );
  const [kereses, setKereses] = useState("");
  const [foglalt, setFoglalt] = useState(false);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push(`/szerviz/munkalapok/${state.id}`);
    } else if (state.message) toast.error(state.message);
  }, [state, router]);

  const osszeg = useMemo(() => munkalapOsszesites(sorok), [sorok]);
  const talalatok = useMemo(() => {
    const q = kereses.trim().toLowerCase();
    return q
      ? arlista.filter((t) => `${t.kod} ${t.nev}`.toLowerCase().includes(q)).slice(0, 10)
      : [];
  }, [kereses, arlista]);
  const err = (n: string) => (!state.success ? state.fieldErrors?.[n]?.[0] : undefined);
  const frissit = (key: string, m: Partial<SorAllapot>) =>
    setSorok((l) => l.map((s) => (s.key === key ? { ...s, ...m } : s)));
  const uj = (m: Partial<MunkalapSor> = {}) =>
    setSorok((l) => [
      ...l,
      {
        key: `s${seq++}`,
        tipus: "munka",
        forras: "kezi",
        leiras: "",
        mennyiseg: 1,
        egyseg: "óra",
        ...m,
      },
    ]);

  /** Picks an árlista item: the frozen price comes from the server (snapshot), never the browser. */
  async function arlistabol(t: ArlistaElem) {
    if (!partnerId) {
      toast.error("Az árlistás tételhez előbb válassz partnert.");
      return;
    }
    setFoglalt(true);
    const r = await munkalapArSnapshotAction(t.id, partnerId);
    setFoglalt(false);
    if (!r.ok) {
      toast.error(r.message);
      return;
    }
    uj({
      tipus: t.forras === "termek" ? "anyag" : "munka",
      forras: t.forras,
      arlistaTetelId: t.id,
      leiras: t.nev,
      egyseg: t.egyseg,
      nettoEgysegar: r.snapshot.vegAr,
      arSnapshot: r.snapshot,
      keszletbolKiad: t.forras === "termek",
    });
    setKereses("");
  }

  const kuldendo = sorok.map((s) => {
    const r = { ...s } as Partial<SorAllapot>;
    delete r.key;
    return r;
  });

  return (
    <form action={formAction} className="flex flex-col gap-4 md:gap-5">
      <input type="hidden" name="sorok" value={JSON.stringify(kuldendo)} />
      {state.success === false && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      <FormSection title="Megrendelő és munka" columns={2}>
        <Field label="Partner" htmlFor="partnerId" error={err("partnerId")}>
          <NativeSelect
            id="partnerId"
            name="partnerId"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            placeholder="— egyszeri ügyfél —"
            options={partnerek.map((p) => ({ value: p.id, label: p.nev }))}
          />
        </Field>
        <Field label="Hibajegy" htmlFor="hibajegyId">
          <NativeSelect
            id="hibajegyId"
            name="hibajegyId"
            defaultValue={munkalap?.hibajegyId ?? elozetes?.hibajegyId ?? ""}
            placeholder="— nincs —"
            options={hibajegyek.map((h) => ({
              value: h.id,
              label: `${h.azonosito} ${h.targy}`,
            }))}
          />
        </Field>
        <Field label="Egyszeri ügyfél neve" htmlFor="egyszeriNev">
          <Input
            id="egyszeriNev"
            name="egyszeriNev"
            defaultValue={munkalap?.egyszeriNev}
          />
        </Field>
        <Field label="Egyszeri ügyfél telefonja" htmlFor="egyszeriTelefon">
          <Input
            id="egyszeriTelefon"
            name="egyszeriTelefon"
            defaultValue={munkalap?.egyszeriTelefon}
          />
        </Field>
        <Field label="Projekt" htmlFor="projektId">
          <NativeSelect
            id="projektId"
            name="projektId"
            defaultValue={munkalap?.projektId ?? ""}
            placeholder="— nincs —"
            options={projektek.map((p) => ({
              value: p.id,
              label: `${p.azonosito} ${p.nev}`,
            }))}
          />
        </Field>
        <Field label="Helyszín" htmlFor="helyszin">
          <Input id="helyszin" name="helyszin" defaultValue={munkalap?.helyszin} />
        </Field>
        <Field
          label="Munka dátuma"
          htmlFor="munkaDatum"
          required
          error={err("munkaDatum")}
        >
          <Input
            id="munkaDatum"
            name="munkaDatum"
            type="date"
            defaultValue={
              nap(munkalap?.munkaDatum) || new Date().toISOString().slice(0, 10)
            }
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Kezdés" htmlFor="munkaKezdet" error={err("munkaKezdet")}>
            <Input
              id="munkaKezdet"
              name="munkaKezdet"
              type="time"
              defaultValue={munkalap?.munkaKezdet}
            />
          </Field>
          <Field label="Befejezés" htmlFor="munkaVege" error={err("munkaVege")}>
            <Input
              id="munkaVege"
              name="munkaVege"
              type="time"
              defaultValue={munkalap?.munkaVege}
            />
          </Field>
        </div>
        <Field label="Szerelő" htmlFor="szerelo" required error={err("szerelo")}>
          <Input
            id="szerelo"
            name="szerelo"
            defaultValue={munkalap?.szerelo ?? szereloNev}
          />
        </Field>
        <Field label="Kategória" htmlFor="kategoria">
          <Input
            id="kategoria"
            name="kategoria"
            defaultValue={munkalap?.kategoria ?? "Általános munka"}
          />
        </Field>
        <Field
          label="Elvégzett munka"
          htmlFor="leiras"
          required
          error={err("leiras")}
          className="sm:col-span-2"
        >
          <Textarea id="leiras" name="leiras" rows={4} defaultValue={munkalap?.leiras} />
        </Field>
        <Field label="Utazás (km)" htmlFor="utazasKm">
          <Input
            id="utazasKm"
            name="utazasKm"
            type="number"
            min="0"
            step="any"
            defaultValue={munkalap?.utazasKm}
          />
        </Field>
        <Field label="Megjegyzés" htmlFor="megjegyzes">
          <Input id="megjegyzes" name="megjegyzes" defaultValue={munkalap?.megjegyzes} />
        </Field>
      </FormSection>

      <FormSection title="Tételek">
        <div className="flex flex-col gap-2">
          <Label htmlFor="arlista-kereses">Tétel keresése az árlistában</Label>
          <Input
            id="arlista-kereses"
            value={kereses}
            onChange={(e) => setKereses(e.target.value)}
            placeholder="Kód vagy név…"
            autoComplete="off"
            disabled={foglalt}
          />
          {talalatok.length > 0 && (
            <ul className="bg-card divide-y rounded-md border text-sm">
              {talalatok.map((t) => (
                <li key={`${t.forras}-${t.id}`}>
                  <button
                    type="button"
                    className="hover:bg-muted w-full px-3 py-2 text-left"
                    onClick={() => void arlistabol(t)}
                  >
                    <span className="text-muted-foreground mr-2 font-mono text-xs">
                      {t.kod}
                    </span>
                    {t.nev}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {t.forras === "termek" ? "termék" : "szolgáltatás"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => uj()}>
              <PlusIcon className="mr-1 size-4" />
              Munkaóra
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => uj({ tipus: "anyag", egyseg: "db" })}
            >
              <PlusIcon className="mr-1 size-4" />
              Kézi anyag
            </Button>
          </div>
        </div>
        {err("sorok") && <p className="text-destructive text-sm">{err("sorok")}</p>}
        {sorok.length === 0 ? (
          <p className="text-muted-foreground text-sm">Még nincs tétel.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="p-1">Típus</th>
                  <th className="p-1">Megnevezés</th>
                  <th className="p-1">Menny.</th>
                  <th className="p-1">Egység</th>
                  <th className="p-1">Nettó egységár</th>
                  <th className="p-1">Készletből</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorok.map((s) => {
                  const arlistas = s.forras !== "kezi";
                  return (
                    <tr key={s.key} className="border-t">
                      <td className="w-28 p-1">
                        <NativeSelect
                          aria-label="Típus"
                          value={s.tipus}
                          disabled={arlistas}
                          onChange={(e) =>
                            frissit(s.key, {
                              tipus: e.target.value as MunkalapSor["tipus"],
                            })
                          }
                          options={MUNKALAP_SOR_TIPUSOK.map((v) => ({
                            value: v,
                            label: MUNKALAP_SOR_TIPUS_LABELS[v],
                          }))}
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          aria-label="Megnevezés"
                          value={s.leiras}
                          onChange={(e) => frissit(s.key, { leiras: e.target.value })}
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
                          // The árlista price is frozen in the snapshot and cannot be edited here.
                          disabled={Boolean(s.arSnapshot)}
                          value={s.nettoEgysegar ?? ""}
                          onChange={(e) =>
                            frissit(s.key, {
                              nettoEgysegar:
                                e.target.value === ""
                                  ? undefined
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="w-24 p-1 text-center">
                        {s.tipus === "anyag" && s.forras === "termek" ? (
                          <input
                            type="checkbox"
                            aria-label="Készletből kiadandó"
                            checked={s.keszletbolKiad === true}
                            onChange={(e) =>
                              frissit(s.key, { keszletbolKiad: e.target.checked })
                            }
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
        <p className="text-sm">
          Munkaóra: <strong>{FT.format(osszeg.munkaOra)}</strong> · Nettó összesen:{" "}
          <strong>{FT.format(osszeg.osszesNetto)} Ft</strong>
        </p>
      </FormSection>

      <FormSection title="Aláírások" columns={2}>
        <AlairasPad
          name="szereloAlairas"
          label="Szerelő aláírása"
          defaultValue={munkalap?.szereloAlairas}
        />
        <div className="flex flex-col gap-3">
          <Field label="Aláíró ügyfél neve" htmlFor="ugyfelNev" error={err("ugyfelNev")}>
            <Input id="ugyfelNev" name="ugyfelNev" defaultValue={munkalap?.ugyfelNev} />
          </Field>
          <AlairasPad
            name="ugyfelAlairas"
            label="Ügyfél aláírása"
            defaultValue={munkalap?.ugyfelAlairas}
          />
        </div>
        {(err("szereloAlairas") || err("ugyfelAlairas")) && (
          <p className="text-destructive text-sm sm:col-span-2">
            {err("szereloAlairas") ?? err("ugyfelAlairas")}
          </p>
        )}
      </FormSection>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {munkalap ? "Munkalap mentése" : "Munkalap felvétele"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
