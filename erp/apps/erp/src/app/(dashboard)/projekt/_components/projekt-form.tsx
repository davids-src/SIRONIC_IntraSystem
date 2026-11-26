"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@erp/ui";
import type { ProjektDetail } from "@erp/projekt";
import { createProjektAction, updateProjektAction, type FormState } from "../actions";
import { Field, FormActions, FormSection, SELECT_CLASS } from "./layout";

export function ProjektForm({
  projekt,
  partnerek,
  felhasznalok,
}: {
  projekt?: ProjektDetail;
  partnerek: Array<{ id: string; nev: string }>;
  felhasznalok: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const bound = projekt
    ? updateProjektAction.bind(null, projekt.id)
    : createProjektAction;
  const [state, action, pending] = useActionState(bound, { success: false } as FormState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push(`/projekt/${state.id ?? projekt?.id ?? ""}`);
    } else if (state.message) toast.error(state.message);
  }, [state, router, projekt]);

  const err = !state.success ? state.fieldErrors : undefined;

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormSection step={1} title="Alapadatok" columns={2}>
        <Field
          label="Projekt neve"
          htmlFor="nev"
          required
          error={err?.nev?.[0]}
          className="sm:col-span-2"
        >
          <Input id="nev" name="nev" defaultValue={projekt?.nev} required />
        </Field>
        <Field label="Partner" htmlFor="partnerId" error={err?.partnerId?.[0]}>
          <select
            id="partnerId"
            name="partnerId"
            defaultValue={projekt?.partnerId ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">— nincs —</option>
            {partnerek.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nev}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Felelős" htmlFor="felelosId">
          <select
            id="felelosId"
            name="felelosId"
            defaultValue={projekt?.felelosId ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">— nincs —</option>
            {felhasznalok.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kategória" htmlFor="kategoria">
          <Input id="kategoria" name="kategoria" defaultValue={projekt?.kategoria} />
        </Field>
        <Field
          label="Tervezett órák"
          htmlFor="tervezettOrak"
          error={err?.tervezettOrak?.[0]}
        >
          <Input
            id="tervezettOrak"
            name="tervezettOrak"
            type="number"
            min={0}
            step="0.5"
            defaultValue={projekt?.tervezettOrak}
          />
        </Field>
        <Field label="Kezdet" htmlFor="kezdet" error={err?.kezdet?.[0]}>
          <Input id="kezdet" name="kezdet" type="date" defaultValue={projekt?.kezdet} />
        </Field>
        <Field label="Határidő" htmlFor="hatarido" error={err?.hatarido?.[0]}>
          <Input
            id="hatarido"
            name="hatarido"
            type="date"
            defaultValue={projekt?.hatarido}
          />
        </Field>
        <Field label="Leírás" htmlFor="leiras" className="sm:col-span-2">
          <Textarea id="leiras" name="leiras" rows={3} defaultValue={projekt?.leiras} />
        </Field>
      </FormSection>

      <FormSection step={2} title="Láthatóság és belső jegyzet">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="portalLathato"
            defaultChecked={projekt?.portalLathato}
            className="size-4"
          />
          Látható a partnernek (partnerportálon)
        </label>
        <Field
          label="Belső jegyzet"
          htmlFor="belsoJegyzet"
          hint="Soha nem látja a partner."
        >
          <Textarea
            id="belsoJegyzet"
            name="belsoJegyzet"
            rows={3}
            defaultValue={projekt?.belsoJegyzet}
          />
        </Field>
      </FormSection>

      <FormActions>
        <Button type="submit" loading={pending} disabled={pending} size="lg">
          {projekt ? "Mentés" : "Projekt felvétele"}
        </Button>
      </FormActions>
    </form>
  );
}
