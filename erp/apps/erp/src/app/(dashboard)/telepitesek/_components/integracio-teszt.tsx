"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge, Button } from "@erp/ui";
import { INTEGRACIO_LABELS, type IntegracioSzolgaltato } from "@erp/deployments/client";
import { tesztIntegracioAction } from "../actions";

export type KapcsolatKartya = {
  id: string;
  szolgaltato: IntegracioSzolgaltato;
  cimke: string;
  aktiv: boolean;
  utolsoEllenorzes?: string;
  utolsoEllenorzesOk?: boolean;
  utolsoEllenorzesUzenet?: string;
};

/** Connection cards with the "Teszt" button — shows only the outcome, never any credential. */
export function IntegracioTesztek({
  kapcsolatok,
  tesztelhet,
}: {
  kapcsolatok: KapcsolatKartya[];
  tesztelhet: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [aktualis, setAktualis] = useState<string | null>(null);
  if (kapcsolatok.length === 0) return null;
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
                k.utolsoEllenorzesOk === undefined
                  ? "neutral"
                  : k.utolsoEllenorzesOk
                    ? "success"
                    : "danger"
              }
            >
              {k.utolsoEllenorzesOk === undefined
                ? "Nem tesztelt"
                : k.utolsoEllenorzesOk
                  ? "Működik"
                  : "Hiba"}
            </Badge>
          </div>
          {k.utolsoEllenorzesUzenet && (
            <p className="text-muted-foreground text-xs">{k.utolsoEllenorzesUzenet}</p>
          )}
          {tesztelhet && (
            <div>
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
                Teszt
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
