"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input } from "@erp/ui";
import { ELVESZTES_OKOK, ELVESZTES_OK_LABELS } from "@erp/ertekesites/client";
import type { ErtekesitesFormState } from "../actions";
import { NativeSelect } from "@/app/(dashboard)/partner/_components/form-ui";

export type AllapotLehetoseg = {
  allapot: string;
  label: string;
  /** Extra input the transition needs. */
  mezo?: "elvesztes" | "alairo";
  kiemelt?: boolean;
};

type Action = (prev: ErtekesitesFormState, fd: FormData) => Promise<ErtekesitesFormState>;

function Lehetoseg({ action, l }: { action: Action; l: AllapotLehetoseg }) {
  const router = useRouter();
  const [state, form, pending] = useActionState(action, {
    success: false,
  } as ErtekesitesFormState);
  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.refresh();
    } else if (state.message) toast.error(state.message);
  }, [state, router]);
  const hiba = !state.success ? state.fieldErrors : undefined;
  return (
    <form action={form} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="allapot" value={l.allapot} />
      {l.mezo === "elvesztes" && (
        <>
          <NativeSelect
            name="elvesztesOka"
            aria-label="Elutasítás oka"
            placeholder="Ok kiválasztása"
            options={ELVESZTES_OKOK.map((v) => ({
              value: v,
              label: ELVESZTES_OK_LABELS[v],
            }))}
            className="w-48"
          />
          <Input name="elvesztesMegjegyzes" placeholder="Megjegyzés" className="w-56" />
        </>
      )}
      {l.mezo === "alairo" && (
        <Input name="ugyfelNev" placeholder="Aláíró neve" className="w-56" />
      )}
      <Button
        type="submit"
        size="sm"
        variant={l.kiemelt ? "default" : "outline"}
        disabled={pending}
      >
        {l.label}
      </Button>
      {hiba &&
        Object.values(hiba).map((m, i) => (
          <span key={i} className="text-destructive text-sm">
            {m[0]}
          </span>
        ))}
    </form>
  );
}

/** One small form per allowed status transition (the action is bound to the document id). */
export function AllapotPanel({
  action,
  lehetosegek,
}: {
  action: Action;
  lehetosegek: AllapotLehetoseg[];
}) {
  if (lehetosegek.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {lehetosegek.map((l) => (
        <Lehetoseg key={l.allapot} action={action} l={l} />
      ))}
    </div>
  );
}
