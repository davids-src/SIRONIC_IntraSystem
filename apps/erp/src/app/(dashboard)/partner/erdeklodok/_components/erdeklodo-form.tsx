"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@erp/ui";
import type { ErdeklodoDetail } from "@erp/partner/client";
import { Field, FormSection } from "../../_components/form-ui";
import {
  createErdeklodoAction,
  updateErdeklodoAction,
  type ErdeklodoFormState,
} from "../actions";

export function ErdeklodoForm({ erdeklodo }: { erdeklodo?: ErdeklodoDetail }) {
  const router = useRouter();
  const action = erdeklodo
    ? updateErdeklodoAction.bind(null, erdeklodo.id)
    : createErdeklodoAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } satisfies ErdeklodoFormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      if (state.id) router.push(`/partner/erdeklodok/${state.id}`);
    } else if (state.message) toast.error(state.message);
    else if (state.fieldErrors)
      toast.error("A mentés sikertelen — ellenőrizd az adatokat.");
  }, [state, router]);

  const fe = !state.success ? state.fieldErrors : undefined;
  const err = (k: string) => fe?.[k]?.[0];
  const e = erdeklodo;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormSection title="Érdeklődő adatai" columns={2}>
        <Field
          label="Cégnév"
          htmlFor="cegNev"
          required
          error={err("cegNev")}
          className="sm:col-span-2"
        >
          <Input id="cegNev" name="cegNev" required defaultValue={e?.cegNev} />
        </Field>
        <Field
          label="Kapcsolattartó neve"
          htmlFor="kapcsolattartoNev"
          error={err("kapcsolattartoNev")}
        >
          <Input
            id="kapcsolattartoNev"
            name="kapcsolattartoNev"
            defaultValue={e?.kapcsolattartoNev}
          />
        </Field>
        <Field label="Weboldal" htmlFor="weboldal" error={err("weboldal")}>
          <Input id="weboldal" name="weboldal" defaultValue={e?.weboldal} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={err("email")}>
          <Input id="email" name="email" type="email" defaultValue={e?.email} />
        </Field>
        <Field label="Telefon" htmlFor="telefon" error={err("telefon")}>
          <Input id="telefon" name="telefon" type="tel" defaultValue={e?.telefon} />
        </Field>
      </FormSection>

      <FormSection title="Értékesítési adatok" columns={2}>
        <Field label="Forrás" htmlFor="forras" error={err("forras")}>
          <Input id="forras" name="forras" defaultValue={e?.forras} />
        </Field>
        <Field label="Kategória" htmlFor="kategoria" error={err("kategoria")}>
          <Input id="kategoria" name="kategoria" defaultValue={e?.kategoria} />
        </Field>
        <Field label="Iparág" htmlFor="iparag" error={err("iparag")}>
          <Input id="iparag" name="iparag" defaultValue={e?.iparag} />
        </Field>
        <Field label="Üzletág" htmlFor="uzletiEgyseg" error={err("uzletiEgyseg")}>
          <Input id="uzletiEgyseg" name="uzletiEgyseg" defaultValue={e?.uzletiEgyseg} />
        </Field>
        <Field
          label="Becsült érték (Ft)"
          htmlFor="becsultErtek"
          error={err("becsultErtek")}
        >
          <Input
            id="becsultErtek"
            name="becsultErtek"
            inputMode="decimal"
            defaultValue={e?.becsultErtek}
          />
        </Field>
        <Field
          label="Következő lépés"
          htmlFor="kovetkezoLepes"
          error={err("kovetkezoLepes")}
        >
          <Input
            id="kovetkezoLepes"
            name="kovetkezoLepes"
            defaultValue={e?.kovetkezoLepes}
          />
        </Field>
        <Field
          label="Következő lépés ideje"
          htmlFor="kovetkezoLepesIdopont"
          error={err("kovetkezoLepesIdopont")}
        >
          <Input
            id="kovetkezoLepesIdopont"
            name="kovetkezoLepesIdopont"
            type="date"
            defaultValue={e?.kovetkezoLepesIdopont?.slice(0, 10)}
          />
        </Field>
        <Field
          label="Megjegyzés"
          htmlFor="megjegyzes"
          error={err("megjegyzes")}
          className="sm:col-span-2"
        >
          <Textarea
            id="megjegyzes"
            name="megjegyzes"
            rows={4}
            defaultValue={e?.megjegyzes}
          />
        </Field>
      </FormSection>

      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={pending} size="lg">
          {e ? "Mentés" : "Érdeklődő felvétele"}
        </Button>
      </div>
    </form>
  );
}
