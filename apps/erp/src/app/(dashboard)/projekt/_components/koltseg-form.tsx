"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@erp/ui";
import {
  KOLTSEG_TIPUSOK,
  KOLTSEG_TIPUS_LABELS,
  type KoltsegListItem,
} from "@erp/projekt/client";
import { createKoltsegAction, updateKoltsegAction, type FormState } from "../actions";
import { FajlFeltolto, mediaUrl } from "./kozos";
import { Field, FormActions, FormSection, SELECT_CLASS } from "./layout";

export function KoltsegForm({
  koltseg,
  projektId,
  projektek,
}: {
  koltseg?: KoltsegListItem;
  projektId?: string;
  projektek: Array<{ id: string; azonosito: string; nev: string }>;
}) {
  const router = useRouter();
  const bound = koltseg
    ? updateKoltsegAction.bind(null, koltseg._id)
    : createKoltsegAction;
  const [state, action, pending] = useActionState(bound, { success: false } as FormState);
  const [mediaId, setMediaId] = useState(koltseg?.bizonylatMediaId ?? "");

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push(`/projekt/koltsegek${state.id ? `?projektId=${state.id}` : ""}`);
    } else if (state.message) toast.error(state.message);
  }, [state, router]);

  const err = !state.success ? state.fieldErrors : undefined;
  const ma = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="bizonylatMediaId" value={mediaId} />
      <FormSection step={1} title="Költség" columns={2}>
        <Field
          label="Projekt"
          htmlFor="projektId"
          required
          error={err?.projektId?.[0]}
          className="sm:col-span-2"
        >
          <select
            id="projektId"
            name="projektId"
            defaultValue={koltseg?.projektId ?? projektId ?? ""}
            className={SELECT_CLASS}
            required
          >
            <option value="" disabled>
              Válassz projektet
            </option>
            {projektek.map((p) => (
              <option key={p.id} value={p.id}>
                {p.azonosito} — {p.nev}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Típus" htmlFor="tipus" required error={err?.tipus?.[0]}>
          <select
            id="tipus"
            name="tipus"
            defaultValue={koltseg?.tipus ?? "anyag"}
            className={SELECT_CLASS}
          >
            {KOLTSEG_TIPUSOK.map((t) => (
              <option key={t} value={t}>
                {KOLTSEG_TIPUS_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dátum" htmlFor="datum" required error={err?.datum?.[0]}>
          <Input
            id="datum"
            name="datum"
            type="date"
            defaultValue={koltseg?.datum?.slice(0, 10) ?? ma}
            required
          />
        </Field>
        <Field label="Nettó összeg" htmlFor="osszeg" required error={err?.osszeg?.[0]}>
          <Input
            id="osszeg"
            name="osszeg"
            type="number"
            min={0}
            step="any"
            defaultValue={koltseg?.osszeg}
            required
          />
        </Field>
        <Field label="Pénznem" htmlFor="penznem">
          <Input
            id="penznem"
            name="penznem"
            defaultValue={koltseg?.penznem ?? "HUF"}
            maxLength={8}
          />
        </Field>
        <Field label="Leírás" htmlFor="leiras" className="sm:col-span-2">
          <Textarea id="leiras" name="leiras" rows={2} defaultValue={koltseg?.leiras} />
        </Field>
        <Field label="Bizonylat" hint="Kép vagy PDF." className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <FajlFeltolto
              label={mediaId ? "Másik fájl" : "Fájl feltöltése"}
              onFeltoltve={setMediaId}
            />
            {mediaId && (
              <a
                href={mediaUrl(mediaId)}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline"
              >
                Feltöltött bizonylat
              </a>
            )}
          </div>
        </Field>
      </FormSection>
      <FormActions>
        <Button type="submit" loading={pending} disabled={pending} size="lg">
          {koltseg ? "Mentés" : "Költség rögzítése"}
        </Button>
      </FormActions>
    </form>
  );
}
