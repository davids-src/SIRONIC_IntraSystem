"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@erp/ui";
import { Field, FormActions, FormSection, SELECT_CLASS } from "../../eszkoz/_components/form/form-layout";
import type { UrlapAllapot } from "../actions";

export type MezoDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "checkbox" | "password" | "date";
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  hint?: string;
  wide?: boolean;
  rows?: number;
  /** Never pre-filled (secrets): a blank value keeps the stored one. */
  titkos?: boolean;
};

export type MezoSzekcio = { title: string; description?: string; mezok: MezoDef[] };

/** One generic Server-Action form for the small Telepítések entities. */
export function MezoForm({
  action,
  szekciok,
  ertekek = {},
  submitLabel,
  redirectTo,
}: {
  action: (prev: UrlapAllapot, fd: FormData) => Promise<UrlapAllapot>;
  szekciok: MezoSzekcio[];
  ertekek?: Record<string, string | number | boolean | undefined | null>;
  submitLabel: string;
  /** Where to go after saving; `{id}` is replaced by the saved id. */
  redirectTo: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } satisfies UrlapAllapot);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? "Mentve.");
      router.push(redirectTo.replace("{id}", state.id ?? ""));
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, redirectTo]);

  const hibak = !state.success ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {szekciok.map((sz, i) => (
        <FormSection key={sz.title} step={i + 1} title={sz.title} description={sz.description} columns={2}>
          {sz.mezok.map((m) => {
            const v = ertekek[m.name];
            const cls = m.wide || m.type === "textarea" ? "sm:col-span-2" : undefined;
            return (
              <Field
                key={m.name}
                label={m.label}
                htmlFor={m.name}
                required={m.required}
                hint={m.hint}
                error={hibak?.[m.name]?.[0]}
                className={cls}
              >
                {m.type === "textarea" ? (
                  <Textarea id={m.name} name={m.name} rows={m.rows ?? 4} defaultValue={v == null ? "" : String(v)} className="font-mono text-xs" />
                ) : m.type === "select" ? (
                  <select id={m.name} name={m.name} defaultValue={v == null ? "" : String(v)} className={SELECT_CLASS}>
                    {m.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : m.type === "checkbox" ? (
                  <input id={m.name} name={m.name} type="checkbox" defaultChecked={Boolean(v)} className="size-4" />
                ) : (
                  <Input
                    id={m.name}
                    name={m.name}
                    type={m.type === "number" ? "number" : m.type === "password" ? "password" : m.type === "date" ? "date" : "text"}
                    step={m.type === "number" ? "any" : undefined}
                    autoComplete={m.titkos ? "new-password" : undefined}
                    defaultValue={m.titkos || v == null ? "" : String(v)}
                    placeholder={m.titkos ? "(változatlan, ha üres)" : undefined}
                  />
                )}
              </Field>
            );
          })}
        </FormSection>
      ))}
      <FormActions>
        <Button type="submit" loading={pending} disabled={pending} size="lg">
          {submitLabel}
        </Button>
      </FormActions>
    </form>
  );
}
