"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@erp/ui";
import { SECRET_REVEAL_HIDE_MS } from "@erp/secrets/client";
import { revealSecretAction } from "../actions";

const MASK = "**********";

/**
 * Fetches the value on click, shows it with a copy button and hides it again after 10 seconds.
 * The value lives only in this component's state — it is cleared on hide and on unmount.
 */
export function RevealButton({ id }: { id: string }) {
  const [value, setValue] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setValue(null);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const reveal = () =>
    start(async () => {
      const r = await revealSecretAction(id);
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      setValue(r.value);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(hide, SECRET_REVEAL_HIDE_MS);
    });

  const copy = async () => {
    if (value === null) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Vágólapra másolva.");
    } catch {
      toast.error("A másolás nem sikerült.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="bg-muted min-h-10 rounded-md px-3 py-2 font-mono text-sm break-all whitespace-pre-wrap"
        aria-live="polite"
        data-testid="secret-value"
      >
        {value ?? MASK}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {value === null ? (
          <Button type="button" onClick={reveal} disabled={pending}>
            {pending ? "Betöltés…" : "Megjelenítés"}
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={copy}>
              Másolás
            </Button>
            <Button type="button" variant="outline" onClick={hide}>
              Elrejtés
            </Button>
            <span className="text-muted-foreground text-xs">
              {SECRET_REVEAL_HIDE_MS / 1000} másodperc múlva automatikusan elrejtjük.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
