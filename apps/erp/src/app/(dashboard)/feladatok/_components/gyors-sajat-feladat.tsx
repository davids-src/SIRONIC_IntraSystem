"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { Button, Input, cn } from "@erp/ui";
import { FELADAT_CIM_MAX } from "@erp/feladat/client";
import { sajatFeladatAction } from "../actions";
import { KategoriaMezo } from "./kategoria-mezo";
import { HATARIDO_GYORS, napPlusz } from "./uj-feladat-form";

/**
 * One line to jot down an own task: title, kategória (required, #68 — the last one used is kept
 * for the next), deadline with Ma / Holnap / 1 hét presets.
 */
export function GyorsSajatFeladat({
  ma,
  kategoriak,
}: {
  ma: string;
  kategoriak: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cim, setCim] = useState("");
  const [hatarido, setHatarido] = useState(ma);
  const [kategoria, setKategoria] = useState("");
  const [probalt, setProbalt] = useState(false);
  const kategoriaHiba = probalt && !kategoria.trim();

  return (
    <form
      className="bg-card flex flex-col gap-2 rounded-lg border p-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!cim.trim()) return;
        setProbalt(true);
        if (!kategoria.trim()) return;
        startTransition(async () => {
          const r = await sajatFeladatAction({
            cim,
            hatarido,
            kategoria: kategoria.trim(),
          });
          if (r.success) {
            toast.success(r.message);
            setCim("");
            setHatarido(ma);
            setProbalt(false);
            router.refresh();
          } else toast.error(r.message ?? "Nem sikerült.");
        });
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={cim}
          onChange={(e) => setCim(e.target.value)}
          maxLength={FELADAT_CIM_MAX}
          placeholder="Saját teendő felvétele — pl. „Ajánlat visszahívása”"
          className="bg-background min-w-0 flex-1 basis-64"
          aria-label="Saját feladat"
        />
        <KategoriaMezo
          value={kategoria}
          onChange={setKategoria}
          kategoriak={kategoriak}
          className="w-full sm:w-56"
          invalid={kategoriaHiba}
        />
        <Button type="submit" size="sm" disabled={pending || !cim.trim()}>
          <PlusIcon className="h-4 w-4" aria-hidden />
          Felveszem
        </Button>
      </div>
      {cim.trim() && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Határidő:</span>
          {HATARIDO_GYORS.slice(0, 3).map((g) => {
            const nap = napPlusz(ma, g.nap);
            return (
              <button
                key={g.cimke}
                type="button"
                aria-pressed={hatarido === nap}
                onClick={() => setHatarido(nap)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 font-medium",
                  hatarido === nap
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {g.cimke}
              </button>
            );
          })}
          <Input
            type="date"
            value={hatarido}
            min={ma}
            onChange={(e) => setHatarido(e.target.value)}
            className="bg-background h-7 w-36 text-xs"
            aria-label="Határidő"
            required
          />
          {kategoriaHiba && (
            <span className="text-danger ml-auto" role="alert">
              Adj meg kategóriát — válassz vagy írj újat.
            </span>
          )}
        </div>
      )}
    </form>
  );
}
