"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Label, Textarea } from "@erp/ui";
import type { ArlistaFormState, ArlistaSimpleResult } from "../actions";

export const SELECT_CLASS =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export function FieldError({ state, name }: { state: ArlistaFormState; name: string }) {
  const msg = state.success === false ? state.fieldErrors?.[name]?.[0] : undefined;
  return msg ? <p className="text-destructive text-sm">{msg}</p> : null;
}

export function Field({
  label,
  name,
  state,
  required,
  hint,
  children,
}: {
  label: string;
  name: string;
  state: ArlistaFormState;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      <FieldError state={state} name={name} />
    </div>
  );
}

export function TextField({
  label,
  name,
  state,
  defaultValue,
  required,
  type = "text",
  hint,
  step,
}: {
  label: string;
  name: string;
  state: ArlistaFormState;
  defaultValue?: string | number;
  required?: boolean;
  type?: string;
  hint?: string;
  step?: string;
}) {
  return (
    <Field label={label} name={name} state={state} required={required} hint={hint}>
      <Input id={name} name={name} type={type} step={step} defaultValue={defaultValue} />
    </Field>
  );
}

export function TextAreaField({
  label,
  name,
  state,
  defaultValue,
}: {
  label: string;
  name: string;
  state: ArlistaFormState;
  defaultValue?: string;
}) {
  return (
    <Field label={label} name={name} state={state}>
      <Textarea id={name} name={name} defaultValue={defaultValue} rows={3} />
    </Field>
  );
}

/** Toast + redirect/refresh once a form action succeeded. */
export function useFormEffects(
  state: ArlistaFormState,
  onSuccessHref?: (id?: string) => string,
) {
  const router = useRouter();
  // Latest callback without making the effect re-run on every render (inline lambdas).
  const hrefRef = useRef(onSuccessHref);
  useEffect(() => {
    hrefRef.current = onSuccessHref;
  });
  useEffect(() => {
    const onSuccessHref = hrefRef.current;
    if (state.success) {
      if (state.message) toast.success(state.message);
      if (onSuccessHref) router.push(onSuccessHref(state.id));
      else router.refresh();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);
}

/** Archive button: asks for the mandatory reason first. */
export function ArchivalGomb({
  onArchival,
  onVisszaallit,
  archivalt,
}: {
  onArchival: (ok: string) => Promise<ArlistaSimpleResult>;
  onVisszaallit: () => Promise<ArlistaSimpleResult>;
  archivalt: boolean;
}) {
  const router = useRouter();
  const [nyitva, setNyitva] = useState(false);
  const [ok, setOk] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<ArlistaSimpleResult>) =>
    startTransition(async () => {
      const r = await fn();
      if (r.success) {
        if (r.message) toast.success(r.message);
        setNyitva(false);
        setOk("");
        router.refresh();
      } else if (r.message) toast.error(r.message);
    });

  if (archivalt) {
    return (
      <Button variant="outline" loading={pending} onClick={() => run(onVisszaallit)}>
        Visszaállítás
      </Button>
    );
  }
  if (!nyitva) {
    return (
      <Button variant="outline" onClick={() => setNyitva(true)}>
        Archiválás
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <Label htmlFor="archivalas-ok">Archiválás oka (kötelező)</Label>
      <Input id="archivalas-ok" value={ok} onChange={(e) => setOk(e.target.value)} />
      <div className="flex gap-2">
        <Button
          variant="destructive"
          loading={pending}
          disabled={ok.trim().length < 3}
          onClick={() => run(() => onArchival(ok))}
        >
          Archiválás megerősítése
        </Button>
        <Button variant="ghost" onClick={() => setNyitva(false)}>
          Mégse
        </Button>
      </div>
    </div>
  );
}
