"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@erp/ui";
import { HIBAJEGY_ALLAPOT_LABELS, type HibajegyAllapot } from "@erp/szerviz/client";
import type { SzervizFormState } from "../actions";
import { NativeSelect } from "@/app/(dashboard)/partner/_components/form-ui";

type FormAction = (prev: SzervizFormState, fd: FormData) => Promise<SzervizFormState>;

function useUrlap(action: FormAction, resetelj = false) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [state, form, pending] = useActionState(action, {
    success: false,
  } as SzervizFormState);
  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      if (resetelj) ref.current?.reset();
      router.refresh();
    } else if (state.message) toast.error(state.message);
  }, [state, router, resetelj]);
  const hiba = !state.success
    ? Object.values(state.fieldErrors ?? {}).flat()[0]
    : undefined;
  return { ref, form, pending, hiba };
}

/** Status change — one small form; the facade guards the transition. */
export function AllapotUrlap({
  action,
  lehetosegek,
}: {
  action: FormAction;
  lehetosegek: HibajegyAllapot[];
}) {
  const { form, pending, hiba } = useUrlap(action);
  if (lehetosegek.length === 0) return null;
  return (
    <form action={form} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          name="allapot"
          aria-label="Új állapot"
          className="w-48"
          options={lehetosegek.map((v) => ({
            value: v,
            label: HIBAJEGY_ALLAPOT_LABELS[v],
          }))}
        />
        <Input
          name="megjegyzes"
          placeholder="Megjegyzés az előzményekhez"
          className="w-72"
        />
        <Button type="submit" size="sm" disabled={pending}>
          Állapot módosítása
        </Button>
      </div>
      <Input
        name="megoldasJegyzet"
        placeholder="Megoldás leírása (a partner látja; „Megoldva” állapotnál)"
      />
      {hiba && <p className="text-destructive text-sm">{hiba}</p>}
    </form>
  );
}

export function FelelosUrlap({
  action,
  felhasznalok,
  aktualis,
}: {
  action: FormAction;
  felhasznalok: Array<{ id: string; name: string }>;
  aktualis?: string;
}) {
  const { form, pending } = useUrlap(action);
  return (
    <form action={form} className="flex flex-wrap items-center gap-2">
      <NativeSelect
        name="felelosId"
        aria-label="Felelős"
        className="w-64"
        defaultValue={aktualis ?? ""}
        placeholder="— nincs —"
        options={felhasznalok.map((u) => ({ value: u.id, label: u.name }))}
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Kijelölés
      </Button>
    </form>
  );
}

/** New comment; the internal toggle is only offered to users who may write internal notes. */
export function MegjegyzesUrlap({
  action,
  belsoEngedett,
}: {
  action: FormAction;
  belsoEngedett: boolean;
}) {
  const { ref, form, pending, hiba } = useUrlap(action, true);
  return (
    <form ref={ref} action={form} className="flex flex-col gap-2">
      <Textarea
        name="uzenet"
        rows={3}
        placeholder="Megjegyzés…"
        aria-label="Megjegyzés"
      />
      <div className="flex flex-wrap items-center gap-4">
        {belsoEngedett && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="belso" />
            Belső megjegyzés (a partner nem látja)
          </label>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          Megjegyzés rögzítése
        </Button>
      </div>
      {hiba && <p className="text-destructive text-sm">{hiba}</p>}
    </form>
  );
}
