"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@erp/ui";
import {
  HIBAJEGY_KEZI_FORRASOK,
  HIBAJEGY_FORRAS_LABELS,
  HIBAJEGY_PRIORITASOK,
  HIBAJEGY_PRIORITAS_LABELS,
  type HibajegyDetail,
} from "@erp/szerviz/client";
import {
  createHibajegyAction,
  updateHibajegyAction,
  type SzervizFormState,
} from "../actions";
import {
  Field,
  FormSection,
  NativeSelect,
} from "@/app/(dashboard)/partner/_components/form-ui";

export function HibajegyForm({
  hibajegy,
  partnerek,
  felhasznalok,
  projektek,
  belsoJegyzetSzerkesztheto,
}: {
  hibajegy?: HibajegyDetail;
  partnerek: Array<{ id: string; nev: string }>;
  felhasznalok: Array<{ id: string; name: string }>;
  projektek: Array<{ id: string; azonosito: string; nev: string }>;
  belsoJegyzetSzerkesztheto: boolean;
}) {
  const router = useRouter();
  const action = hibajegy
    ? updateHibajegyAction.bind(null, hibajegy.id)
    : createHibajegyAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } as SzervizFormState);
  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push(`/szerviz/hibajegyek/${state.id}`);
    } else if (state.message) toast.error(state.message);
  }, [state, router]);
  const err = (n: string) => (!state.success ? state.fieldErrors?.[n]?.[0] : undefined);
  // A ticket that came in through the portal keeps its source.
  const portalForras = hibajegy?.forras === "portal";

  return (
    <form action={formAction} className="flex flex-col gap-4 md:gap-5">
      {state.success === false && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      <FormSection title="Bejelentés" columns={2}>
        <Field
          label="Tárgy"
          htmlFor="targy"
          required
          error={err("targy")}
          className="sm:col-span-2"
        >
          <Input id="targy" name="targy" defaultValue={hibajegy?.targy} />
        </Field>
        <Field
          label="Leírás"
          htmlFor="leiras"
          required
          error={err("leiras")}
          className="sm:col-span-2"
        >
          <Textarea id="leiras" name="leiras" rows={5} defaultValue={hibajegy?.leiras} />
        </Field>
        <Field label="Kategória" htmlFor="kategoria" error={err("kategoria")}>
          <Input
            id="kategoria"
            name="kategoria"
            defaultValue={hibajegy?.kategoria ?? "Általános"}
          />
        </Field>
        <Field label="Prioritás" htmlFor="prioritas">
          <NativeSelect
            id="prioritas"
            name="prioritas"
            defaultValue={hibajegy?.prioritas ?? "kozepes"}
            options={HIBAJEGY_PRIORITASOK.map((v) => ({
              value: v,
              label: HIBAJEGY_PRIORITAS_LABELS[v],
            }))}
          />
        </Field>
        <Field label="Helyszín" htmlFor="helyszin">
          <Input id="helyszin" name="helyszin" defaultValue={hibajegy?.helyszin} />
        </Field>
        <Field label="Érintett tételek" htmlFor="erintettTetelek">
          <Input
            id="erintettTetelek"
            name="erintettTetelek"
            defaultValue={hibajegy?.erintettTetelek}
          />
        </Field>
      </FormSection>

      <FormSection title="Ügyfél és kezelés" columns={2}>
        <Field label="Partner" htmlFor="partnerId" error={err("partnerId")}>
          <NativeSelect
            id="partnerId"
            name="partnerId"
            defaultValue={hibajegy?.partnerId ?? ""}
            placeholder="— egyszeri ügyfél —"
            options={partnerek.map((p) => ({ value: p.id, label: p.nev }))}
          />
        </Field>
        <Field label="Forrás" htmlFor="forras">
          {portalForras ? (
            <>
              <Input value={HIBAJEGY_FORRAS_LABELS.portal} disabled readOnly />
              <input type="hidden" name="forras" value="crm" />
            </>
          ) : (
            <NativeSelect
              id="forras"
              name="forras"
              defaultValue={hibajegy?.forras ?? "crm"}
              options={HIBAJEGY_KEZI_FORRASOK.map((v) => ({
                value: v,
                label: HIBAJEGY_FORRAS_LABELS[v],
              }))}
            />
          )}
        </Field>
        <Field label="Egyszeri ügyfél neve" htmlFor="egyszeriNev">
          <Input
            id="egyszeriNev"
            name="egyszeriNev"
            defaultValue={hibajegy?.egyszeriNev}
          />
        </Field>
        <Field label="Egyszeri ügyfél telefonja" htmlFor="egyszeriTelefon">
          <Input
            id="egyszeriTelefon"
            name="egyszeriTelefon"
            defaultValue={hibajegy?.egyszeriTelefon}
          />
        </Field>
        <Field label="Projekt" htmlFor="projektId">
          <NativeSelect
            id="projektId"
            name="projektId"
            defaultValue={hibajegy?.projektId ?? ""}
            placeholder="— nincs —"
            options={projektek.map((p) => ({
              value: p.id,
              label: `${p.azonosito} ${p.nev}`,
            }))}
          />
        </Field>
        <Field label="Felelős" htmlFor="felelosId">
          <NativeSelect
            id="felelosId"
            name="felelosId"
            defaultValue={hibajegy?.felelosId ?? ""}
            placeholder="— nincs —"
            options={felhasznalok.map((u) => ({ value: u.id, label: u.name }))}
          />
        </Field>
        {belsoJegyzetSzerkesztheto && (
          <Field
            label="Belső jegyzet (a partner nem látja)"
            htmlFor="belsoJegyzet"
            className="sm:col-span-2"
          >
            <Textarea
              id="belsoJegyzet"
              name="belsoJegyzet"
              rows={3}
              defaultValue={hibajegy?.belsoJegyzet}
            />
          </Field>
        )}
      </FormSection>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {hibajegy ? "Hibajegy mentése" : "Hibajegy felvétele"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
