"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input } from "@erp/ui";
import type { BizonylatFormState } from "../actions";

type Action = (prev: BizonylatFormState, fd: FormData) => Promise<BizonylatFormState>;

export type AkcioMezo = {
  name: string;
  placeholder: string;
  /** Rendered as a select when options are given. */
  opciok?: Array<{ value: string; label: string }>;
};

/** One small form for a single workflow action (the server action is bound to the document id). */
export function AkcioForm({
  action,
  label,
  mezo,
  hidden,
  kiemelt,
  veszelyes,
  megerosites,
}: {
  action: Action;
  label: string;
  mezo?: AkcioMezo;
  hidden?: Record<string, string>;
  kiemelt?: boolean;
  veszelyes?: boolean;
  megerosites?: string;
}) {
  const router = useRouter();
  const [state, form, pending] = useActionState(action, {
    success: false,
  } as BizonylatFormState);
  useEffect(() => {
    if (state.success) {
      toast.success(state.message, { duration: 12_000 });
      router.refresh();
    } else if (state.message) toast.error(state.message, { duration: 12_000 });
  }, [state, router]);
  const hiba = !state.success ? state.fieldErrors : undefined;
  return (
    <form
      action={form}
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        if (megerosites && !window.confirm(megerosites)) e.preventDefault();
      }}
    >
      {hidden &&
        Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      {mezo &&
        (mezo.opciok ? (
          <select
            name={mezo.name}
            aria-label={mezo.placeholder}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            {mezo.opciok.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <Input name={mezo.name} placeholder={mezo.placeholder} className="w-64" />
        ))}
      <Button
        type="submit"
        size="sm"
        variant={veszelyes ? "destructive" : kiemelt ? "default" : "outline"}
        disabled={pending}
      >
        {label}
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
