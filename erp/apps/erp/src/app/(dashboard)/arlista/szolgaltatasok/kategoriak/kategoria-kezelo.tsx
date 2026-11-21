"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Checkbox, Input, Label } from "@erp/ui";
import type { KategoriaDto } from "@erp/arlista/client";
import {
  createAlkategoriaAction,
  createKategoriaAction,
  deleteAlkategoriaAction,
  updateKategoriaAction,
  type ArlistaFormState,
} from "../../actions";
import { TextField, useFormEffects } from "../../_components/form-bits";

const initial: ArlistaFormState = { success: false };

function UjKategoria() {
  const [state, action, pending] = useActionState(createKategoriaAction, initial);
  useFormEffects(state);
  return (
    <form action={action} className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-4">
      <TextField label="Név" name="nev" state={state} required />
      <TextField label="Kódelőtag" name="kodElotag" state={state} required hint="pl. IT" />
      <TextField label="Szín" name="szin" state={state} type="color" defaultValue="#6366f1" />
      <div className="flex items-end">
        <Button type="submit" loading={pending}>
          Kategória felvétele
        </Button>
      </div>
    </form>
  );
}

function KategoriaSor({ k }: { k: KategoriaDto }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateKategoriaAction.bind(null, k._id), initial);
  const [alState, alAction, alPending] = useActionState(
    createAlkategoriaAction.bind(null, k._id),
    initial,
  );
  const [torles, startTorles] = useTransition();
  useFormEffects(state);
  useFormEffects(alState);

  return (
    <section className="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <form action={action} className="grid items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_auto_auto]">
        <TextField label={`Név (${k.kodElotag})`} name="nev" state={state} defaultValue={k.nev} required />
        <TextField label="Szín" name="szin" state={state} type="color" defaultValue={k.szin} />
        <TextField label="Sorrend" name="sorrend" state={state} type="number" defaultValue={k.sorrend} />
        <div className="flex items-center gap-2 pb-2">
          <Checkbox id={`aktiv-${k._id}`} name="aktiv" defaultChecked={k.aktiv} />
          <Label htmlFor={`aktiv-${k._id}`}>Aktív</Label>
        </div>
        <Button type="submit" variant="outline" loading={pending}>
          Mentés
        </Button>
      </form>

      <ul className="flex flex-col gap-1 pl-4 text-sm">
        {k.alkategoriak.map((a) => (
          <li key={a._id} className="flex items-center gap-2">
            <span>— {a.nev}</span>
            <Button
              variant="ghost"
              size="sm"
              loading={torles}
              onClick={() =>
                startTorles(async () => {
                  const r = await deleteAlkategoriaAction(a._id);
                  if (!r.success && r.message) toast.error(r.message);
                  router.refresh();
                })
              }
            >
              Törlés
            </Button>
          </li>
        ))}
      </ul>
      <form action={alAction} className="flex items-end gap-2 pl-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`alk-${k._id}`}>Új alkategória</Label>
          <Input id={`alk-${k._id}`} name="nev" required />
        </div>
        <Button type="submit" variant="outline" size="sm" loading={alPending}>
          Hozzáadás
        </Button>
      </form>
    </section>
  );
}

export function KategoriaKezelo({ kategoriak }: { kategoriak: KategoriaDto[] }) {
  return (
    <div className="flex flex-col gap-4">
      <UjKategoria />
      {kategoriak.map((k) => (
        <KategoriaSor key={k._id} k={k} />
      ))}
    </div>
  );
}
