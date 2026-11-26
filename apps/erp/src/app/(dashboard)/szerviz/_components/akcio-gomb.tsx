"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@erp/ui";
import type { SzervizFormState } from "../actions";

type Action = (prev: SzervizFormState) => Promise<SzervizFormState>;

/**
 * A one-button form for an id-bound server action (restore, retry stock issue, generate ticket).
 * `atiranyit` receives the action's result id and may return a URL to navigate to.
 */
export function AkcioGomb({
  action,
  label,
  variant = "outline",
  atiranyit,
}: {
  action: Action;
  label: string;
  variant?: "default" | "outline";
  atiranyit?: (id?: string) => string | undefined;
}) {
  const router = useRouter();
  const [state, form, pending] = useActionState(action, {
    success: false,
  } as SzervizFormState);
  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      const cel = atiranyit?.(state.id);
      if (cel) router.push(cel);
      else router.refresh();
    } else if (state.message) toast.error(state.message);
  }, [state, router, atiranyit]);
  return (
    <form action={form}>
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {label}
      </Button>
    </form>
  );
}
