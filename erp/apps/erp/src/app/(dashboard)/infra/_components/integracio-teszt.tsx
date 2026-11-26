"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge, Button } from "@erp/ui";
import { INTEGRACIO_LABELS, type IntegracioSzolgaltato } from "@erp/infra/client";
import { tesztIntegracioAction } from "../actions";

export type KapcsolatKartya = {
  id: string;
  szolgaltato: IntegracioSzolgaltato;
  cimke: string;
  alapUrl: string;
  aktiv: boolean;
  utolsoEllenorzes?: string;
  utolsoEllenorzesOk?: boolean;
  utolsoEllenorzesUzenet?: string;
};

/** Connection cards with "Teszt" and "Szerkesztés" — shows only outcomes, never any credential. */
export function IntegracioKartyak({
  kapcsolatok,
  tesztelhet,
}: {
  kapcsolatok: KapcsolatKartya[];
  tesztelhet: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [aktualis, setAktualis] = useState<string | null>(null);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {kapcsolatok.map((k) => (
        <div key={k.id} className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">
              {INTEGRACIO_LABELS[k.szolgaltato]} · {k.cimke}
            </span>
            <Badge
              variant={
                !k.aktiv
                  ? "neutral"
                  : k.utolsoEllenorzesOk === undefined
                    ? "neutral"
                    : k.utolsoEllenorzesOk
                      ? "success"
                      : "danger"
              }
            >
              {!k.aktiv
                ? "Kikapcsolva"
                : k.utolsoEllenorzesOk === undefined
                  ? "Nem tesztelt"
                  : k.utolsoEllenorzesOk
                    ? "Működik"
                    : "Hiba"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs break-all">{k.alapUrl}</p>
          {k.utolsoEllenorzesUzenet && (
            <p className="text-muted-foreground text-xs">
              {k.utolsoEllenorzesUzenet}
              {k.utolsoEllenorzes &&
                ` · ${new Date(k.utolsoEllenorzes).toLocaleString("hu-HU")}`}
            </p>
          )}
          {tesztelhet && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                loading={pending && aktualis === k.id}
                disabled={pending}
                onClick={() => {
                  setAktualis(k.id);
                  start(async () => {
                    const r = await tesztIntegracioAction(k.id);
                    if (r.success) toast.success(r.message);
                    else toast.error(r.message ?? "A teszt sikertelen.");
                    router.refresh();
                  });
                }}
              >
                Kapcsolat tesztelése
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/infra/integraciok/${k.id}`}>Szerkesztés</Link>
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
