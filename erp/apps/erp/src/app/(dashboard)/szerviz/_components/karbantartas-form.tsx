"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@erp/ui";
import {
  HIBAJEGY_PRIORITASOK,
  HIBAJEGY_PRIORITAS_LABELS,
  type KarbantartasDetail,
} from "@erp/szerviz/client";
import {
  createKarbantartasAction,
  updateKarbantartasAction,
  type SzervizFormState,
} from "../actions";
import {
  Field,
  FormSection,
  NativeSelect,
} from "@/app/(dashboard)/partner/_components/form-ui";

export function KarbantartasForm({
  terv,
  partnerek,
  felhasznalok,
}: {
  terv?: KarbantartasDetail;
  partnerek: Array<{ id: string; nev: string }>;
  felhasznalok: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const action = terv
    ? updateKarbantartasAction.bind(null, terv.id)
    : createKarbantartasAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } as SzervizFormState);
  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      if (terv) router.refresh();
      else router.push(`/szerviz/karbantartas/${state.id}`);
    } else if (state.message) toast.error(state.message);
  }, [state, router, terv]);
  const err = (n: string) => (!state.success ? state.fieldErrors?.[n]?.[0] : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 md:gap-5">
      {state.success === false && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      <FormSection title="Ütemezés" columns={2}>
        <Field
          label="Terv címe"
          htmlFor="cim"
          required
          error={err("cim")}
          className="sm:col-span-2"
        >
          <Input id="cim" name="cim" defaultValue={terv?.cim} />
        </Field>
        <Field label="Partner" htmlFor="partnerId" required error={err("partnerId")}>
          <NativeSelect
            id="partnerId"
            name="partnerId"
            defaultValue={terv?.partnerId ?? ""}
            placeholder="Válassz partnert"
            options={partnerek.map((p) => ({ value: p.id, label: p.nev }))}
          />
        </Field>
        <Field
          label="Gyakoriság (hónap)"
          htmlFor="intervallumHonap"
          required
          error={err("intervallumHonap")}
        >
          <Input
            id="intervallumHonap"
            name="intervallumHonap"
            type="number"
            min="1"
            max="60"
            defaultValue={terv?.intervallumHonap ?? 12}
          />
        </Field>
        <Field
          label="Első esedékesség"
          htmlFor="elsoEsedekes"
          required
          error={err("elsoEsedekes")}
        >
          <Input
            id="elsoEsedekes"
            name="elsoEsedekes"
            type="date"
            defaultValue={terv?.elsoEsedekes}
          />
        </Field>
        <Field
          label="Előrejelzés (nap az esedékesség előtt)"
          htmlFor="elorejelzesNap"
          error={err("elorejelzesNap")}
        >
          <Input
            id="elorejelzesNap"
            name="elorejelzesNap"
            type="number"
            min="0"
            max="120"
            defaultValue={terv?.elorejelzesNap ?? 14}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="aktiv" defaultChecked={terv?.aktiv ?? true} />
          Aktív terv
        </label>
      </FormSection>

      <FormSection title="Generált hibajegy sablonja" columns={2}>
        <Field label="Kategória" htmlFor="kategoria">
          <Input
            id="kategoria"
            name="kategoria"
            defaultValue={terv?.kategoria ?? "Preventív karbantartás"}
          />
        </Field>
        <Field label="Prioritás" htmlFor="prioritas">
          <NativeSelect
            id="prioritas"
            name="prioritas"
            defaultValue={terv?.prioritas ?? "kozepes"}
            options={HIBAJEGY_PRIORITASOK.map((v) => ({
              value: v,
              label: HIBAJEGY_PRIORITAS_LABELS[v],
            }))}
          />
        </Field>
        <Field label="Alapértelmezett felelős" htmlFor="felelosId">
          <NativeSelect
            id="felelosId"
            name="felelosId"
            defaultValue={terv?.felelosId ?? ""}
            placeholder="— nincs —"
            options={felhasznalok.map((u) => ({ value: u.id, label: u.name }))}
          />
        </Field>
        <Field label="Projekt azonosító (opcionális)" htmlFor="projektId">
          <Input id="projektId" name="projektId" defaultValue={terv?.projektId} />
        </Field>
        <Field
          label="Leírás (a hibajegy leírása lesz)"
          htmlFor="sablonLeiras"
          className="sm:col-span-2"
        >
          <Textarea
            id="sablonLeiras"
            name="sablonLeiras"
            rows={4}
            defaultValue={terv?.sablonLeiras}
          />
        </Field>
      </FormSection>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {terv ? "Terv mentése" : "Terv felvétele"}
        </Button>
        {!terv && (
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Mégse
          </Button>
        )}
      </div>
    </form>
  );
}
