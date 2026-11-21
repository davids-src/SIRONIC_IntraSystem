"use client";

import { useActionState } from "react";
import { Button, Checkbox, Label } from "@erp/ui";
import {
  AFA_KULCSOK,
  PENZNEMEK,
  TETEL_EGYSEGEK,
  TETEL_TIPUSOK,
  TETEL_TIPUS_LABELS,
  type TermekDetail,
} from "@erp/arlista/client";
import {
  createTermekAction,
  updateTermekAction,
  type ArlistaFormState,
} from "../../actions";
import { Field, SELECT_CLASS, TextAreaField, TextField, useFormEffects } from "../../_components/form-bits";

const initial: ArlistaFormState = { success: false };

export function TermekForm({ termek }: { termek?: TermekDetail }) {
  const szerkesztes = Boolean(termek);
  const [state, action, pending] = useActionState(
    termek ? updateTermekAction.bind(null, termek._id) : createTermekAction,
    initial,
  );
  useFormEffects(state, szerkesztes ? undefined : (id) => `/arlista/termekek/${id}`);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-6">
      {!szerkesztes && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Típus" name="tipus" state={state} required>
            <select id="tipus" name="tipus" className={SELECT_CLASS} defaultValue="termek">
              {TETEL_TIPUSOK.map((t) => (
                <option key={t} value={t}>
                  {TETEL_TIPUS_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <TextField
            label="Kódelőtag"
            name="kodElotag"
            state={state}
            hint="Üresen hagyva a típus alapértelmezett előtagja (pl. HW). A kód: ELŐTAG-0001."
          />
        </div>
      )}
      {szerkesztes && (
        <p className="text-muted-foreground text-sm">
          Kód: <span className="font-mono">{termek!.kod}</span> (nem módosítható)
        </p>
      )}
      <TextField label="Név" name="nev" state={state} required defaultValue={termek?.nev} />
      <TextAreaField label="Leírás" name="leiras" state={state} defaultValue={termek?.leiras} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Kategória"
          name="kategoria"
          state={state}
          required
          defaultValue={termek?.kategoria}
        />
        <Field label="Egység" name="egyseg" state={state} required>
          <input
            id="egyseg"
            name="egyseg"
            list="egysegek"
            defaultValue={termek?.egyseg ?? "db"}
            className={SELECT_CLASS}
          />
          <datalist id="egysegek">
            {TETEL_EGYSEGEK.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Nettó ár"
          name="nettoAr"
          state={state}
          required
          type="number"
          step="any"
          defaultValue={termek?.nettoAr}
        />
        <Field label="Pénznem" name="penznem" state={state}>
          <select id="penznem" name="penznem" className={SELECT_CLASS} defaultValue={termek?.penznem ?? "HUF"}>
            {PENZNEMEK.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="ÁFA (%)" name="afaKulcs" state={state}>
          <select id="afaKulcs" name="afaKulcs" className={SELECT_CLASS} defaultValue={termek?.afaKulcs ?? 27}>
            {AFA_KULCSOK.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <TextAreaField label="Megjegyzés" name="megjegyzes" state={state} defaultValue={termek?.megjegyzes} />
      <div className="flex items-center gap-2">
        <Checkbox id="aktiv" name="aktiv" defaultChecked={termek?.aktiv ?? true} />
        <Label htmlFor="aktiv">Aktív (ajánlatba, megrendelésbe tehető)</Label>
      </div>
      {state.success === false && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      <div>
        <Button type="submit" loading={pending} disabled={pending}>
          {szerkesztes ? "Mentés" : "Tétel felvétele"}
        </Button>
      </div>
    </form>
  );
}
