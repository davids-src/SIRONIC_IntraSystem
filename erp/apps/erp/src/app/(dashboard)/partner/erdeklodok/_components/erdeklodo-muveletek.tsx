"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@erp/ui";
import {
  ERDEKLODO_ALLAPOTOK,
  ERDEKLODO_ALLAPOT_LABELS,
  ERDEKLODO_KEZI_TEVEKENYSEG_TIPUSOK,
  ERDEKLODO_TEVEKENYSEG_LABELS,
  type ErdeklodoAllapot,
} from "@erp/partner/client";
import { NativeSelect } from "../../_components/form-ui";
import {
  addTevekenysegAction,
  assignErdeklodoAction,
  changeAllapotAction,
  convertErdeklodoAction,
  type ErdeklodoFormState,
} from "../actions";

const initial: ErdeklodoFormState = { success: false };

function useResult(state: ErdeklodoFormState, onOk?: (s: ErdeklodoFormState) => void) {
  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      onOk?.(state);
      router.refresh();
    } else if (state.message) toast.error(state.message);
  }, [state]);
}

export function ErdeklodoMuveletek({
  id,
  allapot,
  felelosVagyok,
  vanFelelos,
  partnerId,
  canConvert,
}: {
  id: string;
  allapot: ErdeklodoAllapot;
  felelosVagyok: boolean;
  vanFelelos: boolean;
  partnerId?: string;
  canConvert: boolean;
}) {
  const router = useRouter();
  const [pendingAssign, startAssign] = useTransition();
  const [stState, stAction, stPending] = useActionState(
    changeAllapotAction.bind(null, id),
    initial,
  );
  const [tevState, tevAction, tevPending] = useActionState(
    addTevekenysegAction.bind(null, id),
    initial,
  );
  const [convState, convAction, convPending] = useActionState(
    convertErdeklodoAction.bind(null, id),
    initial,
  );
  useResult(stState);
  useResult(tevState);
  useResult(convState, (s) => {
    if (s.success && s.id) router.push(`/partner/${s.id}`);
  });

  const assign = (mode: "me" | "none") =>
    startAssign(async () => {
      const r = await assignErdeklodoAction(id, mode);
      if (r.success) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.message ?? "Sikertelen művelet");
    });

  const stErr = !stState.success ? stState.fieldErrors : undefined;
  const tevErr = !tevState.success ? tevState.fieldErrors : undefined;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        action={stAction}
        className="bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-sm"
      >
        <h2 className="text-base font-semibold">Állapot módosítása</h2>
        <NativeSelect
          name="allapot"
          aria-label="Új állapot"
          defaultValue={allapot}
          options={ERDEKLODO_ALLAPOTOK.map((k) => ({
            value: k,
            label: ERDEKLODO_ALLAPOT_LABELS[k],
          }))}
        />
        <Input
          name="elvesztesOka"
          placeholder="Elvesztés oka (csak „Elveszett” esetén kötelező)"
        />
        <Input name="megjegyzes" placeholder="Megjegyzés (opcionális)" />
        {stErr &&
          Object.values(stErr)
            .flat()
            .map((m) => (
              <p key={m} className="text-destructive text-sm">
                {m}
              </p>
            ))}
        <Button type="submit" size="sm" className="w-fit" disabled={stPending}>
          Állapot mentése
        </Button>
      </form>

      <form
        action={tevAction}
        className="bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-sm"
      >
        <h2 className="text-base font-semibold">Tevékenység rögzítése</h2>
        <NativeSelect
          name="tipus"
          aria-label="Tevékenység típusa"
          defaultValue="hivas"
          options={ERDEKLODO_KEZI_TEVEKENYSEG_TIPUSOK.map((k) => ({
            value: k,
            label: ERDEKLODO_TEVEKENYSEG_LABELS[k],
          }))}
        />
        <Textarea
          name="szoveg"
          rows={3}
          placeholder="Mi történt?"
          aria-label="Tevékenység leírása"
        />
        {tevErr?.szoveg && <p className="text-destructive text-sm">{tevErr.szoveg[0]}</p>}
        <Button type="submit" size="sm" className="w-fit" disabled={tevPending}>
          Rögzítés
        </Button>
      </form>

      <div className="bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-sm lg:col-span-2">
        <h2 className="text-base font-semibold">Felelős és partnerré alakítás</h2>
        <div className="flex flex-wrap gap-2">
          {!felelosVagyok && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pendingAssign}
              onClick={() => assign("me")}
            >
              Én leszek a felelős
            </Button>
          )}
          {vanFelelos && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pendingAssign}
              onClick={() => assign("none")}
            >
              Felelős törlése
            </Button>
          )}
          {canConvert && !partnerId && (
            <form action={convAction}>
              <Button type="submit" size="sm" disabled={convPending}>
                Partnerré alakítás
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
