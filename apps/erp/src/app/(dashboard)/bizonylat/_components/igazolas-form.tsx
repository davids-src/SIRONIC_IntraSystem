"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button, Input, Label, Textarea } from "@erp/ui";
import {
  AFA_KULCSOK,
  PENZNEMEK,
  sorokOsszesites,
  type IgazolasDetail,
  type IgazolasForras,
  type IgazolasSor,
} from "@erp/bizonylat/client";
import {
  createIgazolasAction,
  importForrasAction,
  updateIgazolasAction,
  type BizonylatFormState,
} from "../actions";
import {
  Field,
  FormSection,
  NativeSelect,
} from "@/app/(dashboard)/partner/_components/form-ui";

type SorAllapot = IgazolasSor & { key: string };
export type ImportOpcio = { kind: "ajanlat" | "projekt"; id: string; label: string };

let seq = 0;
const FT = new Intl.NumberFormat("hu-HU");
const day = (iso?: string) => (iso ? iso.slice(0, 10) : "");

export function IgazolasForm({
  igazolas,
  partnerek,
  forrasok,
  belsoLathato,
}: {
  igazolas?: IgazolasDetail;
  partnerek: Array<{ id: string; nev: string }>;
  forrasok: ImportOpcio[];
  /** Internal purchase price / note fields only for staff with the write permission. */
  belsoLathato: boolean;
}) {
  const router = useRouter();
  const action = igazolas
    ? updateIgazolasAction.bind(null, igazolas.id)
    : createIgazolasAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } as BizonylatFormState);
  const [sorok, setSorok] = useState<SorAllapot[]>(
    () => igazolas?.sorok.map((s) => ({ ...s, key: `i${seq++}` })) ?? [],
  );
  const [cim, setCim] = useState(igazolas?.cim ?? "");
  const [partnerId, setPartnerId] = useState(igazolas?.partnerId ?? "");
  const [osszegzes, setOsszegzes] = useState(igazolas?.munkaOsszegzes ?? "");
  const [kezdet, setKezdet] = useState(day(igazolas?.idoszakKezdet));
  const [vege, setVege] = useState(day(igazolas?.idoszakVege));
  const [forras, setForras] = useState<IgazolasForras>(igazolas?.forras ?? "kezi");
  const [projektId, setProjektId] = useState(igazolas?.projektId ?? "");
  const [ajanlatId, setAjanlatId] = useState(igazolas?.ajanlatId ?? "");
  const [penznem, setPenznem] = useState(igazolas?.penznem ?? "HUF");
  const [valasztott, setValasztott] = useState("");
  const [betoltes, indit] = useTransition();

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push(`/bizonylat/igazolasok/${state.id}`);
    } else if (state.message) toast.error(state.message);
  }, [state, router]);

  const osszeg = useMemo(() => sorokOsszesites(sorok), [sorok]);
  const err = (n: string) => (!state.success ? state.fieldErrors?.[n]?.[0] : undefined);
  const frissit = (key: string, m: Partial<SorAllapot>) =>
    setSorok((l) => l.map((s) => (s.key === key ? { ...s, ...m } : s)));
  const uj = () =>
    setSorok((l) => [
      ...l,
      {
        key: `i${seq++}`,
        leiras: "",
        mennyiseg: 1,
        egyseg: "db",
        nettoEgysegar: 0,
        afaKulcs: 27,
      },
    ]);
  const kuldendo = sorok.map((s) => {
    const r = { ...s } as Partial<SorAllapot>;
    delete r.key;
    if (!belsoLathato) {
      // Never send what the viewer must not see back to the server on a draft they re-save.
      delete r.beszerzesiEgysegar;
    }
    return r;
  });

  function importal() {
    const opcio = forrasok.find((f) => `${f.kind}:${f.id}` === valasztott);
    if (!opcio) return;
    indit(async () => {
      const r = await importForrasAction(opcio.kind, opcio.id);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      const { adat, partnerId: p, cim: c, penznem: pn } = r.betoltes;
      if (p) setPartnerId(p);
      if (c && !cim) setCim(c);
      if (pn) setPenznem(pn as typeof penznem);
      if (adat.munkaOsszegzes && !osszegzes) setOsszegzes(adat.munkaOsszegzes);
      if (adat.idoszakKezdet) setKezdet(day(adat.idoszakKezdet));
      if (adat.idoszakVege) setVege(day(adat.idoszakVege));
      setForras(adat.forras);
      if (adat.forras === "projekt") setProjektId(adat.forrasId ?? "");
      if (adat.forras === "ajanlat") setAjanlatId(adat.forrasId ?? "");
      if (adat.sorok.length > 0)
        setSorok(adat.sorok.map((s) => ({ ...s, key: `i${seq++}` })));
      toast.success("Adatok betöltve a forrásból — ellenőrizd és egészítsd ki őket.");
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 md:gap-5">
      <input type="hidden" name="sorok" value={JSON.stringify(kuldendo)} />
      <input type="hidden" name="forras" value={forras} />
      <input type="hidden" name="projektId" value={projektId} />
      <input type="hidden" name="ajanlatId" value={ajanlatId} />
      <input
        type="hidden"
        name="munkalapIds"
        value={JSON.stringify(igazolas?.munkalapIds ?? [])}
      />
      {state.success === false && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}

      {forrasok.length > 0 && (
        <FormSection
          title="Betöltés forrásból"
          description="Elfogadott ajánlat tételeinek vagy egy projekt adatainak átvétele. A tételek szerkeszthetők maradnak."
        >
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              aria-label="Forrás"
              value={valasztott}
              onChange={(e) => setValasztott(e.target.value)}
              placeholder="Válassz ajánlatot vagy projektet"
              options={forrasok.map((f) => ({
                value: `${f.kind}:${f.id}`,
                label: `${f.kind === "ajanlat" ? "Ajánlat" : "Projekt"} — ${f.label}`,
              }))}
              className="max-w-xl"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!valasztott || betoltes}
              onClick={importal}
            >
              Betöltés
            </Button>
          </div>
        </FormSection>
      )}

      <FormSection title="Fejléc" columns={2}>
        <Field
          label="Cím"
          htmlFor="cim"
          required
          error={err("cim")}
          className="sm:col-span-2"
        >
          <Input
            id="cim"
            name="cim"
            value={cim}
            onChange={(e) => setCim(e.target.value)}
          />
        </Field>
        <Field label="Partner" htmlFor="partnerId" required error={err("partnerId")}>
          <NativeSelect
            id="partnerId"
            name="partnerId"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            placeholder="Válassz partnert"
            options={partnerek.map((p) => ({ value: p.id, label: p.nev }))}
          />
        </Field>
        <Field
          label="Címzett e-mail (üres: a partner e-mailje)"
          htmlFor="partnerEmail"
          error={err("partnerEmail")}
        >
          <Input
            id="partnerEmail"
            name="partnerEmail"
            type="email"
            defaultValue={igazolas?.partnerEmail}
          />
        </Field>
        <Field label="Munka kezdete" htmlFor="idoszakKezdet">
          <Input
            id="idoszakKezdet"
            name="idoszakKezdet"
            type="date"
            value={kezdet}
            onChange={(e) => setKezdet(e.target.value)}
          />
        </Field>
        <Field label="Munka vége" htmlFor="idoszakVege">
          <Input
            id="idoszakVege"
            name="idoszakVege"
            type="date"
            value={vege}
            onChange={(e) => setVege(e.target.value)}
          />
        </Field>
        <Field label="Összes munkaóra" htmlFor="osszOra">
          <Input
            id="osszOra"
            name="osszOra"
            type="number"
            min="0"
            step="any"
            defaultValue={igazolas?.osszOra}
          />
        </Field>
        <Field label="Pénznem" htmlFor="penznem">
          <NativeSelect
            id="penznem"
            name="penznem"
            value={penznem}
            onChange={(e) => setPenznem(e.target.value)}
            options={PENZNEMEK.map((p) => ({ value: p, label: p }))}
          />
        </Field>
        <Field
          label="A munka összefoglalása"
          htmlFor="munkaOsszegzes"
          required
          error={err("munkaOsszegzes")}
          className="sm:col-span-2"
        >
          <Textarea
            id="munkaOsszegzes"
            name="munkaOsszegzes"
            rows={4}
            value={osszegzes}
            onChange={(e) => setOsszegzes(e.target.value)}
          />
        </Field>
        {belsoLathato && (
          <Field
            label="Belső megjegyzés (az ügyfél nem látja)"
            htmlFor="belsoMegjegyzes"
            className="sm:col-span-2"
          >
            <Textarea
              id="belsoMegjegyzes"
              name="belsoMegjegyzes"
              rows={3}
              defaultValue={igazolas?.belsoMegjegyzes}
            />
          </Field>
        )}
      </FormSection>

      <FormSection title="Tételek">
        <div>
          <Button type="button" variant="outline" size="sm" onClick={uj}>
            <PlusIcon className="mr-1 size-4" />
            Tétel
          </Button>
        </div>
        {err("sorok") && <p className="text-destructive text-sm">{err("sorok")}</p>}
        {sorok.length === 0 ? (
          <p className="text-muted-foreground text-sm">Még nincs tétel.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="p-1">Megnevezés</th>
                  <th className="p-1">Menny.</th>
                  <th className="p-1">Egység</th>
                  <th className="p-1">Nettó egységár</th>
                  <th className="p-1">ÁFA</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorok.map((s) => (
                  <tr key={s.key} className="border-t">
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
                        value={s.nettoEgysegar}
                        onChange={(e) =>
                          frissit(s.key, { nettoEgysegar: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="w-24 p-1">
                      <NativeSelect
                        aria-label="ÁFA"
                        value={String(s.afaKulcs)}
                        onChange={(e) =>
                          frissit(s.key, { afaKulcs: Number(e.target.value) })
                        }
                        options={AFA_KULCSOK.map((k) => ({
                          value: String(k),
                          label: `${k}%`,
                        }))}
                      />
                    </td>
                    <td className="p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Tétel törlése"
                        onClick={() => setSorok((l) => l.filter((x) => x.key !== s.key))}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Label className="sr-only">Összegzés</Label>
        <p className="text-sm">
          Nettó: {FT.format(osszeg.nettoOsszeg)} · ÁFA: {FT.format(osszeg.afaOsszeg)} ·{" "}
          <strong>Bruttó: {FT.format(osszeg.bruttoOsszeg)}</strong>
        </p>
      </FormSection>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {igazolas ? "Igazolás mentése" : "Igazolás létrehozása"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
