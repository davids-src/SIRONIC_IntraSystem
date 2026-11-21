"use client";

import { useActionState } from "react";
import { Button } from "@erp/ui";
import {
  ANYAG_POTLEK_KULCSOK,
  ANYAG_POTLEK_LABELS,
  ORADIJ_KATEGORIAK,
  ORADIJ_KATEGORIA_LABELS,
  SURGOSSEG_KULCSOK,
  SURGOSSEG_LABELS,
  UGYFEL_SZORZO_KULCSOK,
  UGYFEL_SZORZO_LABELS,
  type ArazasiBeallitasok,
} from "@erp/arlista/client";
import { saveBeallitasokAction, type ArlistaFormState } from "../actions";
import { TextField, useFormEffects } from "../_components/form-bits";

const initial: ArlistaFormState = { success: false };

function Csoport({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-xl border">
      <h2 className="bg-muted/40 border-b px-4 py-2 text-base font-semibold">{title}</h2>
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export function BeallitasokForm({ beallitasok: b }: { beallitasok: ArazasiBeallitasok }) {
  const [state, action, pending] = useActionState(saveBeallitasokAction, initial);
  useFormEffects(state);

  return (
    <form action={action} className="flex flex-col gap-6">
      <Csoport title="Rezsi és általános">
        <TextField
          label="Rezsi szorzó"
          name="rezsiSzorzo"
          state={state}
          type="number"
          step="any"
          defaultValue={b.rezsiSzorzo}
          hint="Az óradíjra kerül (pl. 1,45)."
        />
        <TextField
          label="Havi fix költség (Ft)"
          name="haviFixKoltseg"
          state={state}
          type="number"
          step="any"
          defaultValue={b.haviFixKoltseg}
        />
        <TextField
          label="Havi termelékeny órák"
          name="haviTermelekenyOrak"
          state={state}
          type="number"
          step="any"
          defaultValue={b.haviTermelekenyOrak}
        />
        <TextField
          label="ÁFA (tört, pl. 0,27)"
          name="afaKulcs"
          state={state}
          type="number"
          step="any"
          defaultValue={b.afaKulcs}
        />
        <TextField
          label="Min. kiszállási díj (Ft)"
          name="minKiszallasiDij"
          state={state}
          type="number"
          step="any"
          defaultValue={b.minKiszallasiDij}
        />
        <TextField
          label="Min. projektdíj (Ft)"
          name="minProjektDij"
          state={state}
          type="number"
          step="any"
          defaultValue={b.minProjektDij}
        />
      </Csoport>
      <Csoport title="Belső óradíjak (Ft/óra)">
        {ORADIJ_KATEGORIAK.map((k) => (
          <TextField
            key={k}
            label={ORADIJ_KATEGORIA_LABELS[k]}
            name={`oradijak.${k}`}
            state={state}
            type="number"
            step="any"
            defaultValue={b.oradijak[k]}
          />
        ))}
      </Csoport>
      <Csoport title="Ügyfélkategória-szorzók (mátrix oszlopai)">
        {UGYFEL_SZORZO_KULCSOK.map((k) => (
          <TextField
            key={k}
            label={UGYFEL_SZORZO_LABELS[k]}
            name={`ugyfelSzorzok.${k}`}
            state={state}
            type="number"
            step="any"
            defaultValue={b.ugyfelSzorzok[k]}
          />
        ))}
      </Csoport>
      <Csoport title="Sürgősségi szorzók">
        {SURGOSSEG_KULCSOK.map((k) => (
          <TextField
            key={k}
            label={SURGOSSEG_LABELS[k]}
            name={`surgossegiSzorzok.${k}`}
            state={state}
            type="number"
            step="any"
            defaultValue={b.surgossegiSzorzok[k]}
          />
        ))}
      </Csoport>
      <Csoport title="Anyagköltség-pótlékok (tört)">
        {ANYAG_POTLEK_KULCSOK.map((k) => (
          <TextField
            key={k}
            label={ANYAG_POTLEK_LABELS[k]}
            name={`anyagPotlekok.${k}`}
            state={state}
            type="number"
            step="any"
            defaultValue={b.anyagPotlekok[k]}
          />
        ))}
      </Csoport>
      {state.success === false && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      <div>
        <Button type="submit" loading={pending} disabled={pending}>
          Beállítások mentése
        </Button>
      </div>
    </form>
  );
}
