"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button, Input, Label, Textarea } from "@erp/ui";
import {
  AFA_KULCSOK,
  PENZNEMEK,
  megrendeloOsszesites,
  type MegrendeloDetail,
  type MegrendeloSor,
} from "@erp/ertekesites/client";
import {
  createMegrendeloAction,
  updateMegrendeloAction,
  type ErtekesitesFormState,
} from "../actions";
import {
  Field,
  FormSection,
  NativeSelect,
} from "@/app/(dashboard)/partner/_components/form-ui";

type Termek = { id: string; kod: string; nev: string; egyseg: string; nettoAr?: number };
type SorAllapot = MegrendeloSor & { key: string };

let seq = 0;
const FT = new Intl.NumberFormat("hu-HU");
const day = (iso?: string) => (iso ? iso.slice(0, 10) : "");

export function MegrendeloForm({
  megrendelo,
  partnerek,
  termekek,
}: {
  megrendelo?: MegrendeloDetail;
  partnerek: Array<{ id: string; nev: string }>;
  termekek: Termek[];
}) {
  const router = useRouter();
  const action = megrendelo
    ? updateMegrendeloAction.bind(null, megrendelo.id)
    : createMegrendeloAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } as ErtekesitesFormState);
  const [sorok, setSorok] = useState<SorAllapot[]>(
    () => megrendelo?.sorok.map((s) => ({ ...s, key: `m${seq++}` })) ?? [],
  );
  const [kereses, setKereses] = useState("");

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push(`/ertekesites/megrendelok/${state.id}`);
    } else if (state.message) toast.error(state.message);
  }, [state, router]);

  const osszeg = useMemo(() => megrendeloOsszesites(sorok), [sorok]);
  const talalatok = useMemo(() => {
    const q = kereses.trim().toLowerCase();
    return q
      ? termekek.filter((t) => `${t.kod} ${t.nev}`.toLowerCase().includes(q)).slice(0, 10)
      : [];
  }, [kereses, termekek]);
  const err = (n: string) => (!state.success ? state.fieldErrors?.[n]?.[0] : undefined);
  const frissit = (key: string, m: Partial<SorAllapot>) =>
    setSorok((l) => l.map((s) => (s.key === key ? { ...s, ...m } : s)));
  const uj = (m: Partial<MegrendeloSor> = {}) =>
    setSorok((l) => [
      ...l,
      {
        key: `m${seq++}`,
        leiras: "",
        mennyiseg: 1,
        egyseg: "db",
        nettoEgysegar: 0,
        afaKulcs: 27,
        ...m,
      },
    ]);

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
      <FormSection title="Fejléc" columns={2}>
        <Field
          label="Beszállító"
          htmlFor="beszallitoId"
          required
          error={err("beszallitoId")}
        >
          <NativeSelect
            id="beszallitoId"
            name="beszallitoId"
            defaultValue={megrendelo?.beszallitoId ?? ""}
            placeholder="Válassz beszállítót"
            options={partnerek.map((p) => ({ value: p.id, label: p.nev }))}
          />
        </Field>
        <Field label="Pénznem" htmlFor="penznem">
          <NativeSelect
            id="penznem"
            name="penznem"
            defaultValue={megrendelo?.penznem ?? "HUF"}
            options={PENZNEMEK.map((p) => ({ value: p, label: p }))}
          />
        </Field>
        <Field label="Várható szállítás" htmlFor="varhatoSzallitas">
          <Input
            id="varhatoSzallitas"
            name="varhatoSzallitas"
            type="date"
            defaultValue={day(megrendelo?.varhatoSzallitas)}
          />
        </Field>
        <Field label="Projekt azonosító (opcionális)" htmlFor="projektId">
          <Input id="projektId" name="projektId" defaultValue={megrendelo?.projektId} />
        </Field>
        <Field label="Megjegyzés" htmlFor="megjegyzes" className="sm:col-span-2">
          <Textarea
            id="megjegyzes"
            name="megjegyzes"
            rows={3}
            defaultValue={megrendelo?.megjegyzes}
          />
        </Field>
      </FormSection>

      <FormSection title="Tételek">
        <div className="flex flex-col gap-2">
          <Label htmlFor="termek-kereses">Termék keresése az árlistában</Label>
          <Input
            id="termek-kereses"
            value={kereses}
            onChange={(e) => setKereses(e.target.value)}
            placeholder="Kód vagy név…"
            autoComplete="off"
          />
          {talalatok.length > 0 && (
            <ul className="bg-card divide-y rounded-md border text-sm">
              {talalatok.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="hover:bg-muted w-full px-3 py-2 text-left"
                    onClick={() => {
                      uj({
                        arlistaTetelId: t.id,
                        leiras: t.nev,
                        egyseg: t.egyseg,
                        nettoEgysegar: t.nettoAr ?? 0,
                      });
                      setKereses("");
                    }}
                  >
                    <span className="text-muted-foreground mr-2 font-mono text-xs">
                      {t.kod}
                    </span>
                    {t.nev}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => uj()}>
              <PlusIcon className="mr-1 size-4" />
              Kézi tétel
            </Button>
          </div>
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
        <p className="text-sm">
          Nettó: {FT.format(osszeg.nettoOsszeg)} Ft · ÁFA: {FT.format(osszeg.afaOsszeg)}{" "}
          Ft · <strong>Bruttó: {FT.format(osszeg.bruttoOsszeg)} Ft</strong>
        </p>
      </FormSection>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {megrendelo ? "Megrendelőlap mentése" : "Megrendelőlap létrehozása"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
