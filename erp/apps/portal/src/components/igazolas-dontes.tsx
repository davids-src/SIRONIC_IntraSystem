"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@erp/ui";
import { AlairasPad } from "./alairas-pad";

type Result = { ok: true; message?: string } | { ok: false; message: string };

/**
 * Sign-off controls shared by the public magic-link page and the logged-in certificate page.
 * `accept` / `reject` are bound server actions (the page decides which identity they run as).
 */
export function IgazolasDontes({
  accept,
  reject,
}: {
  accept: (adat: { nev: string; beosztas: string; kep: string }) => Promise<Result>;
  reject: (adat: { ok: string }) => Promise<Result>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mod, setMod] = useState<"elfogad" | "elutasit">("elfogad");
  const [uzenet, setUzenet] = useState<Result | null>(null);
  const [kesz, setKesz] = useState(false);

  if (kesz && uzenet?.ok)
    return (
      <p
        role="status"
        className="rounded border border-green-300 bg-green-50 p-4 text-sm"
      >
        {uzenet.message}
      </p>
    );

  return (
    <div className="flex flex-col gap-4 rounded border p-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mod === "elfogad" ? "default" : "outline"}
          onClick={() => setMod("elfogad")}
        >
          Elfogadom és aláírom
        </Button>
        <Button
          type="button"
          variant={mod === "elutasit" ? "destructive" : "outline"}
          onClick={() => setMod("elutasit")}
        >
          Elutasítom
        </Button>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          start(async () => {
            const r =
              mod === "elfogad"
                ? await accept({
                    nev: String(f.get("nev") ?? ""),
                    beosztas: String(f.get("beosztas") ?? ""),
                    kep: String(f.get("kep") ?? ""),
                  })
                : await reject({ ok: String(f.get("ok") ?? "") });
            setUzenet(r);
            if (r.ok) {
              setKesz(true);
              router.refresh();
            }
          });
        }}
      >
        {mod === "elfogad" ? (
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor="nev">Aláíró neve</Label>
              <Input id="nev" name="nev" required maxLength={160} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="beosztas">Beosztás</Label>
              <Input id="beosztas" name="beosztas" required maxLength={160} />
            </div>
            <AlairasPad name="kep" label="Aláírás" />
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <Label htmlFor="ok">Az elutasítás oka</Label>
            <Textarea id="ok" name="ok" required maxLength={2000} rows={4} />
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending
              ? "Küldés…"
              : mod === "elfogad"
                ? "Aláírás beküldése"
                : "Elutasítás beküldése"}
          </Button>
          {uzenet && !uzenet.ok && (
            <p role="alert" className="text-destructive text-sm">
              {uzenet.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
