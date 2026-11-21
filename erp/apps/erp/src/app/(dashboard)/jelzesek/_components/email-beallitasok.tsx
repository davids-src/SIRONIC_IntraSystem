"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Checkbox } from "@erp/ui";
import {
  EMAIL_KATEGORIAK,
  EMAIL_KATEGORIA_CIMKE,
  EMAIL_KATEGORIA_LEIRAS,
  type EmailBeallitasok as Beallitasok,
  type EmailKategoria,
} from "@erp/jelzes/constants";
import { emailBeallitasAction } from "../actions";

/**
 * The three e-mail switches of the Értesítési központ (#71). Saved on each click; everything is
 * off until the user turns it on.
 */
export function EmailBeallitasok({
  kezdo,
  email,
  smtp,
}: {
  kezdo: Beallitasok;
  email: string;
  smtp: boolean;
}) {
  const [allapot, setAllapot] = useState(kezdo);
  const [pending, startTransition] = useTransition();

  const valt = (k: EmailKategoria, be: boolean) => {
    const elozo = allapot;
    setAllapot({ ...allapot, [k]: be });
    startTransition(async () => {
      const r = await emailBeallitasAction(k, be);
      if (r.success && r.beallitasok) {
        setAllapot(r.beallitasok);
        toast.success(
          be
            ? `E-mail bekapcsolva: ${EMAIL_KATEGORIA_CIMKE[k]}`
            : `E-mail kikapcsolva: ${EMAIL_KATEGORIA_CIMKE[k]}`,
        );
      } else {
        setAllapot(elozo);
        toast.error(r.message ?? "Nem sikerült menteni.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">
        Az e-mail a(z) <strong className="text-foreground">{email}</strong> címre megy. A
        csengő és az asztali értesítés ettől függetlenül működik.
      </p>
      {!smtp && (
        <p className="bg-warning/10 text-warning rounded-md px-3 py-2 text-xs">
          A rendszerben jelenleg nincs beállítva levelezőszerver, így e-mail most nem megy
          ki. A beállításod megmarad, és a levelezés bekapcsolásakor érvényes lesz.
        </p>
      )}
      <ul className="flex flex-col divide-y rounded-md border">
        {EMAIL_KATEGORIAK.map((k) => (
          <li key={k}>
            <label className="flex cursor-pointer items-start gap-3 p-3">
              <Checkbox
                className="mt-0.5"
                checked={allapot[k]}
                disabled={pending}
                onCheckedChange={(v) => valt(k, v === true)}
                aria-describedby={`email-${k}-leiras`}
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{EMAIL_KATEGORIA_CIMKE[k]}</span>
                <span id={`email-${k}-leiras`} className="text-muted-foreground text-xs">
                  {EMAIL_KATEGORIA_LEIRAS[k]}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
