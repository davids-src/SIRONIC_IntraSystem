"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@erp/ui";

type Result =
  { ok: true; message?: string; id?: string } | { ok: false; message: string };

/**
 * Form wrapper around a server action (`(formData) => Promise<Result>`): pending state, inline
 * message, optional redirect after success (`{id}` is replaced with the returned id).
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  redirectTo,
  resetOnSuccess = true,
  className,
}: {
  action: (formData: FormData) => Promise<Result>;
  submitLabel: string;
  children: ReactNode;
  redirectTo?: string;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  return (
    <form
      className={className ?? "flex flex-col gap-4"}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        start(async () => {
          const r = await action(data);
          setResult(r);
          if (r.ok) {
            if (resetOnSuccess) form.reset();
            if (redirectTo) router.push(redirectTo.replace("{id}", r.id ?? ""));
            else router.refresh();
          }
        });
      }}
    >
      {children}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Folyamatban…" : submitLabel}
        </Button>
        {result && (
          <p
            role="status"
            className={result.ok ? "text-sm text-green-700" : "text-destructive text-sm"}
          >
            {result.message}
          </p>
        )}
      </div>
    </form>
  );
}

/** One-click action (toggle, remove, …) with a hidden payload. */
export function ActionButton({
  action,
  fields,
  label,
  variant = "outline",
}: {
  action: (formData: FormData) => Promise<Result>;
  fields: Record<string, string>;
  label: string;
  variant?: "outline" | "ghost" | "destructive";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant={variant}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const data = new FormData();
            for (const [k, v] of Object.entries(fields)) data.set(k, v);
            const r = await action(data);
            setErr(r.ok ? null : r.message);
            if (r.ok) router.refresh();
          })
        }
      >
        {label}
      </Button>
      {err && <span className="text-destructive text-xs">{err}</span>}
    </span>
  );
}
