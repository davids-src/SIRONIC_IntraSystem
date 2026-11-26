"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button, Input, Textarea } from "@erp/ui";
import type { SablonDetail } from "@erp/projekt";
import { createSablonAction, updateSablonAction, type FormState } from "../actions";
import { Field, FormActions, FormSection } from "./layout";

type Tetel = { szoveg: string; kotelezo: boolean; mellekletKotelezo: boolean };

export function SablonForm({ sablon }: { sablon?: SablonDetail }) {
  const router = useRouter();
  const bound = sablon ? updateSablonAction.bind(null, sablon.id) : createSablonAction;
  const [state, action, pending] = useActionState(bound, { success: false } as FormState);
  const [tetelek, setTetelek] = useState<Tetel[]>(
    sablon?.tetelek ?? [{ szoveg: "", kotelezo: false, mellekletKotelezo: false }],
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push("/projekt/sablonok");
    } else if (state.message) toast.error(state.message);
  }, [state, router]);

  const err = !state.success ? state.fieldErrors : undefined;
  const set = (i: number, patch: Partial<Tetel>) =>
    setTetelek((t) => t.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const tetelHiba = err
    ? Object.entries(err).find(([k]) => k.startsWith("tetelek"))?.[1]?.[0]
    : undefined;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input
        type="hidden"
        name="tetelek"
        value={JSON.stringify(tetelek.filter((t) => t.szoveg.trim()))}
      />
      <FormSection step={1} title="Sablon" columns={2}>
        <Field
          label="Név"
          htmlFor="nev"
          required
          error={err?.nev?.[0]}
          className="sm:col-span-2"
        >
          <Input id="nev" name="nev" defaultValue={sablon?.nev} required />
        </Field>
        <Field
          label="Kategória"
          htmlFor="kategoria"
          hint="pl. Kamera telepítés, IT audit"
        >
          <Input id="kategoria" name="kategoria" defaultValue={sablon?.kategoria} />
        </Field>
        <Field label="Leírás" htmlFor="leiras" className="sm:col-span-2">
          <Textarea id="leiras" name="leiras" rows={2} defaultValue={sablon?.leiras} />
        </Field>
      </FormSection>

      <FormSection step={2} title="Tételek" description="A sorrend a lista sorrendje.">
        {tetelek.map((t, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input
              aria-label={`${i + 1}. tétel szövege`}
              className="min-w-60 flex-1"
              value={t.szoveg}
              onChange={(e) => set(i, { szoveg: e.target.value })}
              placeholder="Tétel szövege"
            />
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={t.kotelezo}
                onChange={(e) => set(i, { kotelezo: e.target.checked })}
              />
              Kötelező
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={t.mellekletKotelezo}
                onChange={(e) => set(i, { mellekletKotelezo: e.target.checked })}
              />
              Csatolmány kell
            </label>
            <button
              type="button"
              aria-label="Tétel törlése"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setTetelek((x) => x.filter((_, j) => j !== i))}
            >
              <Trash2Icon className="size-4" />
            </button>
          </div>
        ))}
        {tetelHiba && <p className="text-sm text-red-600">{tetelHiba}</p>}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setTetelek((x) => [
                ...x,
                { szoveg: "", kotelezo: false, mellekletKotelezo: false },
              ])
            }
          >
            Új tétel
          </Button>
        </div>
      </FormSection>

      <FormActions>
        <Button type="submit" loading={pending} disabled={pending} size="lg">
          {sablon ? "Mentés" : "Sablon felvétele"}
        </Button>
      </FormActions>
    </form>
  );
}
