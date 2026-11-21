"use client";

import { useActionState, useState } from "react";
import { Button, Checkbox, Input, Label } from "@erp/ui";
import {
  ARAZASI_TIPUSOK,
  ARAZASI_TIPUS_LABELS,
  ORADIJ_KATEGORIAK,
  ORADIJ_KATEGORIA_LABELS,
  TETEL_EGYSEGEK,
  type ArazasiTipus,
  type EgysegSav,
  type KategoriaDto,
  type SzolgaltatasDto,
} from "@erp/arlista/client";
import {
  createSzolgaltatasAction,
  updateSzolgaltatasAction,
  type ArlistaFormState,
} from "../../actions";
import { Field, SELECT_CLASS, TextAreaField, TextField, useFormEffects } from "../../_components/form-bits";

const initial: ArlistaFormState = { success: false };

export function SzolgaltatasForm({
  kategoriak,
  szolgaltatas,
}: {
  kategoriak: KategoriaDto[];
  szolgaltatas?: SzolgaltatasDto;
}) {
  const [state, action, pending] = useActionState(
    szolgaltatas ? updateSzolgaltatasAction.bind(null, szolgaltatas._id) : createSzolgaltatasAction,
    initial,
  );
  useFormEffects(state, szolgaltatas ? undefined : () => "/arlista/szolgaltatasok");
  const [tipus, setTipus] = useState<ArazasiTipus>(szolgaltatas?.arazasiTipus ?? "fix");
  const [kategoriaId, setKategoriaId] = useState(szolgaltatas?.kategoriaId ?? kategoriak[0]?._id ?? "");
  const [savok, setSavok] = useState<EgysegSav[]>(szolgaltatas?.egysegSavok ?? []);
  const alkategoriak = kategoriak.find((k) => k._id === kategoriaId)?.alkategoriak ?? [];

  const savFrissit = (i: number, patch: Partial<EgysegSav>) =>
    setSavok((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      {szolgaltatas && (
        <p className="text-muted-foreground text-sm">
          Kód: <span className="font-mono">{szolgaltatas.kod}</span> (nem módosítható)
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategória" name="kategoriaId" state={state} required>
          <select
            id="kategoriaId"
            name="kategoriaId"
            className={SELECT_CLASS}
            value={kategoriaId}
            onChange={(e) => setKategoriaId(e.target.value)}
          >
            {kategoriak.map((k) => (
              <option key={k._id} value={k._id}>
                {k.nev}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Alkategória" name="alkategoriaId" state={state}>
          <select
            id="alkategoriaId"
            name="alkategoriaId"
            className={SELECT_CLASS}
            defaultValue={szolgaltatas?.alkategoriaId ?? ""}
            key={kategoriaId}
          >
            <option value="">—</option>
            {alkategoriak.map((a) => (
              <option key={a._id} value={a._id}>
                {a.nev}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <TextField label="Név" name="nev" state={state} required defaultValue={szolgaltatas?.nev} />
      <TextAreaField label="Leírás" name="leiras" state={state} defaultValue={szolgaltatas?.leiras} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Egység" name="egyseg" state={state} required>
          <input
            id="egyseg"
            name="egyseg"
            list="szolg-egysegek"
            defaultValue={szolgaltatas?.egyseg ?? "óra"}
            className={SELECT_CLASS}
          />
          <datalist id="szolg-egysegek">
            {TETEL_EGYSEGEK.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
        </Field>
        <Field label="Árazás típusa" name="arazasiTipus" state={state} required>
          <select
            id="arazasiTipus"
            name="arazasiTipus"
            className={SELECT_CLASS}
            value={tipus}
            onChange={(e) => setTipus(e.target.value as ArazasiTipus)}
          >
            {ARAZASI_TIPUSOK.map((t) => (
              <option key={t} value={t}>
                {ARAZASI_TIPUS_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {tipus === "fix" && (
        <TextField
          label="Belső alapár (Ft)"
          name="belsoAlapar"
          state={state}
          type="number"
          step="any"
          required
          defaultValue={szolgaltatas?.belsoAlapar}
          hint="Belső elszámolási ár; az ügyfélkategória szorzói erre épülnek, ügyfélnek sosem jelenik meg."
        />
      )}
      {tipus === "oradij" && (
        <Field label="Óradíj-kategória" name="oradijKategoria" state={state} required>
          <select
            id="oradijKategoria"
            name="oradijKategoria"
            className={SELECT_CLASS}
            defaultValue={szolgaltatas?.oradijKategoria ?? ORADIJ_KATEGORIAK[0]}
          >
            {ORADIJ_KATEGORIAK.map((k) => (
              <option key={k} value={k}>
                {ORADIJ_KATEGORIA_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
      )}
      {tipus === "egysegalapu" && (
        <div className="flex flex-col gap-2">
          <Label>Egységalapú sávok</Label>
          {savok.map((s, i) => (
            <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-2">
              <Input placeholder="Címke" value={s.cimke} onChange={(e) => savFrissit(i, { cimke: e.target.value })} />
              <Input type="number" placeholder="Min" value={s.minEgyseg} onChange={(e) => savFrissit(i, { minEgyseg: Number(e.target.value) })} />
              <Input
                type="number"
                placeholder="Max (üres: nyitott)"
                value={s.maxEgyseg ?? ""}
                onChange={(e) => savFrissit(i, { maxEgyseg: e.target.value === "" ? null : Number(e.target.value) })}
              />
              <Input type="number" placeholder="Alapár" value={s.alapar} onChange={(e) => savFrissit(i, { alapar: Number(e.target.value) })} />
              <Button type="button" variant="ghost" size="sm" onClick={() => setSavok((x) => x.filter((_, j) => j !== i))}>
                Törlés
              </Button>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSavok((x) => [...x, { cimke: "", minEgyseg: 0, maxEgyseg: null, alapar: 0 }])}
            >
              Sáv hozzáadása
            </Button>
          </div>
          <input type="hidden" name="egysegSavok" value={JSON.stringify(savok)} />
          {state.success === false && state.fieldErrors?.egysegSavok && (
            <p className="text-destructive text-sm">{state.fieldErrors.egysegSavok[0]}</p>
          )}
        </div>
      )}
      {tipus === "egyedi" && (
        <p className="text-muted-foreground text-sm">
          Egyedi árajánlatú tételnél nincs kalkulált ár — az ajánlatban kézzel adod meg.
        </p>
      )}

      <TextAreaField label="Belső megjegyzés" name="megjegyzes" state={state} defaultValue={szolgaltatas?.megjegyzes} />
      <TextAreaField label="Ügyfél felé megjelenő megjegyzés" name="ugyfelMegjegyzes" state={state} defaultValue={szolgaltatas?.ugyfelMegjegyzes} />
      <div className="flex items-center gap-2">
        <Checkbox id="aktiv" name="aktiv" defaultChecked={szolgaltatas?.aktiv ?? true} />
        <Label htmlFor="aktiv">Aktív</Label>
      </div>
      {state.success === false && state.message && <p className="text-destructive text-sm">{state.message}</p>}
      <div>
        <Button type="submit" loading={pending} disabled={pending}>
          {szolgaltatas ? "Mentés" : "Szolgáltatás felvétele"}
        </Button>
      </div>
    </form>
  );
}
