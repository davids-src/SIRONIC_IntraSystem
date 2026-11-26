"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input } from "@erp/ui";
import { utankovetesAction, type ErtekesitesFormState } from "../actions";
import { Field } from "@/app/(dashboard)/partner/_components/form-ui";

const day = (iso?: string) => (iso ? iso.slice(0, 10) : "");

export function UtankovetesForm({
  ajanlatId,
  ertekek,
}: {
  ajanlatId: string;
  ertekek: {
    utankovetes?: string;
    utankovetesMegjegyzes?: string;
    kovetkezoLepes?: string;
    kovetkezoLepesIdopont?: string;
  };
}) {
  const router = useRouter();
  const [state, form, pending] = useActionState(utankovetesAction.bind(null, ajanlatId), {
    success: false,
  } as ErtekesitesFormState);
  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    } else if (state.message) toast.error(state.message);
  }, [state, router]);
  return (
    <form action={form} className="grid gap-3 sm:grid-cols-2">
      <Field label="Utánkövetés dátuma" htmlFor="utankovetes">
        <Input
          id="utankovetes"
          name="utankovetes"
          type="date"
          defaultValue={day(ertekek.utankovetes)}
        />
      </Field>
      <Field label="Utánkövetés megjegyzése" htmlFor="utankovetesMegjegyzes">
        <Input
          id="utankovetesMegjegyzes"
          name="utankovetesMegjegyzes"
          defaultValue={ertekek.utankovetesMegjegyzes}
        />
      </Field>
      <Field label="Következő lépés" htmlFor="kovetkezoLepes">
        <Input
          id="kovetkezoLepes"
          name="kovetkezoLepes"
          defaultValue={ertekek.kovetkezoLepes}
        />
      </Field>
      <Field label="Következő lépés ideje" htmlFor="kovetkezoLepesIdopont">
        <Input
          id="kovetkezoLepesIdopont"
          name="kovetkezoLepesIdopont"
          type="date"
          defaultValue={day(ertekek.kovetkezoLepesIdopont)}
        />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Mentés
        </Button>
      </div>
    </form>
  );
}
