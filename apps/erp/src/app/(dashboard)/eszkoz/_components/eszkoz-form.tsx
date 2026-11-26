"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@erp/ui";
import { FIZIKAI_ALLAPOTOK, FIZIKAI_ALLAPOT_LABELS } from "@erp/eszkoz/client";
import type { EszkozDetail } from "@erp/eszkoz";
import { Field, FormActions, FormSection, SELECT_CLASS } from "./form/form-layout";
import { createEszkozAction, updateEszkozAction, type EszkozFormState } from "../actions";

export function EszkozForm({ eszkoz }: { eszkoz?: EszkozDetail }) {
  const router = useRouter();
  const boundAction = eszkoz
    ? updateEszkozAction.bind(null, eszkoz.id)
    : createEszkozAction;
  const [state, action, pending] = useActionState(boundAction, {
    success: false,
  } satisfies EszkozFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push(`/eszkoz/${state.id ?? eszkoz?.id ?? ""}`);
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, eszkoz]);

  const fieldErrors = !state.success ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormSection step={1} title="Alapadatok" columns={2}>
        <Field
          label="Megnevezés"
          htmlFor="megnevezes"
          required
          error={fieldErrors?.megnevezes?.[0]}
          className="sm:col-span-2"
        >
          <Input
            id="megnevezes"
            name="megnevezes"
            defaultValue={eszkoz?.megnevezes}
            required
          />
        </Field>
        <Field label="Márka" htmlFor="marka" error={fieldErrors?.marka?.[0]}>
          <Input id="marka" name="marka" defaultValue={eszkoz?.marka} />
        </Field>
        <Field label="Típusszám" htmlFor="tipusszam" error={fieldErrors?.tipusszam?.[0]}>
          <Input id="tipusszam" name="tipusszam" defaultValue={eszkoz?.tipusszam} />
        </Field>
        <Field label="Gyári szám" htmlFor="gyariSzam" error={fieldErrors?.gyariSzam?.[0]}>
          <Input id="gyariSzam" name="gyariSzam" defaultValue={eszkoz?.gyariSzam} />
        </Field>
        <Field
          label="Fizikai állapot"
          htmlFor="fizikaiAllapot"
          required
          error={fieldErrors?.fizikaiAllapot?.[0]}
        >
          <select
            id="fizikaiAllapot"
            name="fizikaiAllapot"
            defaultValue={eszkoz?.fizikaiAllapot ?? "uj"}
            className={SELECT_CLASS}
          >
            {FIZIKAI_ALLAPOTOK.map((k) => (
              <option key={k} value={k}>
                {FIZIKAI_ALLAPOT_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Jegyzet"
          htmlFor="jegyzet"
          error={fieldErrors?.jegyzet?.[0]}
          className="sm:col-span-2"
        >
          <Textarea id="jegyzet" name="jegyzet" rows={3} defaultValue={eszkoz?.jegyzet} />
        </Field>
      </FormSection>

      <FormActions>
        <Button type="submit" loading={pending} disabled={pending} size="lg">
          {eszkoz ? "Mentés" : "Eszköz felvétele"}
        </Button>
      </FormActions>
    </form>
  );
}
