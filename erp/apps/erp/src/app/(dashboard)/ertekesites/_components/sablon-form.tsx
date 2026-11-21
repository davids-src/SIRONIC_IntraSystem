"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Checkbox, Input, Textarea } from "@erp/ui";
import { kitoltendoValtozok, type SzerzodesSablonDto } from "@erp/ertekesites/client";
import { saveSablonAction, type ErtekesitesFormState } from "../actions";
import { Field, FormSection } from "@/app/(dashboard)/partner/_components/form-ui";
import { useState } from "react";

export function SablonForm({ sablon }: { sablon?: SzerzodesSablonDto }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveSablonAction.bind(null, sablon?.id ?? null),
    { success: false } as ErtekesitesFormState,
  );
  const [szoveg, setSzoveg] = useState(sablon?.szoveg ?? "");
  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push("/ertekesites/szerzodesek/sablonok");
    } else if (state.message) toast.error(state.message);
  }, [state, router]);
  const err = (n: string) => (!state.success ? state.fieldErrors?.[n]?.[0] : undefined);
  const valtozok = kitoltendoValtozok(szoveg);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormSection title="Szerződés-sablon" columns={2}>
        <Field label="Név" htmlFor="nev" required error={err("nev")}>
          <Input id="nev" name="nev" defaultValue={sablon?.nev} />
        </Field>
        <Field label="Kategória" htmlFor="kategoria" required error={err("kategoria")}>
          <Input id="kategoria" name="kategoria" defaultValue={sablon?.kategoria} />
        </Field>
        <Field label="Leírás" htmlFor="leiras" className="sm:col-span-2">
          <Input id="leiras" name="leiras" defaultValue={sablon?.leiras} />
        </Field>
        <Field
          label="Szöveg (HTML, {{változó}} helyőrzőkkel)"
          htmlFor="szoveg"
          required
          error={err("szoveg")}
          className="sm:col-span-2"
        >
          <Textarea
            id="szoveg"
            name="szoveg"
            rows={14}
            value={szoveg}
            onChange={(e) => setSzoveg(e.target.value)}
            className="font-mono text-xs"
          />
          <p className="text-muted-foreground text-xs">
            A <code>{"{{partner_nev}}"}</code> automatikusan kitöltődik.
            {valtozok.length > 0 && ` Kitöltendő változók: ${valtozok.join(", ")}.`}
          </p>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            name="digitalisAlairasKell"
            defaultChecked={sablon?.digitalisAlairasKell}
          />
          Digitális aláírás szükséges
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="aktiv" defaultChecked={sablon?.aktiv ?? true} />
          Aktív
        </label>
      </FormSection>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          Sablon mentése
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
