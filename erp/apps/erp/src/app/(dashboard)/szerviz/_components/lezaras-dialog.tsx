"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@erp/ui";
import {
  lezarMunkalapAction,
  munkalapPreflightAction,
  type MunkalapPreflightEredmeny,
  type SzervizFormState,
} from "../actions";

/**
 * Finalize with a stock preflight: opening the dialog asks the stock module (read-only) whether
 * every material line is available; the confirm button is blocked while something is short.
 * The server re-checks and issues the stock atomically on confirm.
 */
export function LezarasDialog({ munkalapId }: { munkalapId: string }) {
  const router = useRouter();
  const [nyitva, setNyitva] = useState(false);
  const [adat, setAdat] = useState<MunkalapPreflightEredmeny | null>(null);
  const [betolt, inditBetoltes] = useTransition();
  const [state, form, pending] = useActionState(
    lezarMunkalapAction.bind(null, munkalapId),
    {
      success: false,
    } as SzervizFormState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setNyitva(false);
      router.refresh();
    } else if (state.message) {
      toast.error(state.message);
      // A failed stock issue still finalizes the worklog: refresh to show the retry option.
      router.refresh();
    }
  }, [state, router]);

  const megnyit = () => {
    setNyitva(true);
    setAdat(null);
    inditBetoltes(async () => setAdat(await munkalapPreflightAction(munkalapId)));
  };

  const hianyos = adat?.ok && adat.preflight ? !adat.preflight.osszesElegendo : false;

  return (
    <>
      <Button type="button" onClick={megnyit}>
        Munkalap lezárása
      </Button>
      <Dialog open={nyitva} onOpenChange={setNyitva}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Munkalap lezárása</DialogTitle>
            <DialogDescription>
              Lezárás után a munkalap tartalma nem szerkeszthető, a megjelölt anyagok
              kikerülnek a készletből.
            </DialogDescription>
          </DialogHeader>
          {betolt || !adat ? (
            <p className="text-muted-foreground text-sm">Készlet ellenőrzése…</p>
          ) : !adat.ok ? (
            <p className="text-destructive text-sm">{adat.message}</p>
          ) : adat.terv.length === 0 ? (
            <p className="text-sm">Nincs készletből kiadandó anyag.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="p-1">Anyag</th>
                  <th className="p-1 text-right">Kért</th>
                  <th className="p-1 text-right">Szabad</th>
                  <th className="p-1">Állapot</th>
                </tr>
              </thead>
              <tbody>
                {adat.terv.map((t) => {
                  const p = adat.preflight?.sorok.find((s) => s.sorIndex === t.sorIndex);
                  return (
                    <tr key={t.sorIndex} className="border-t">
                      <td className="p-1">{t.nev}</td>
                      <td className="p-1 text-right">
                        {t.mennyiseg} {t.egyseg}
                      </td>
                      <td className="p-1 text-right">{p ? p.szabad : "—"}</td>
                      <td className="p-1">
                        {p?.elegendo ? (
                          <span className="text-green-700">Elegendő</span>
                        ) : (
                          <span className="text-destructive">
                            {p?.uzenet ?? "Nincs elég"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <form action={form} className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setNyitva(false)}>
              Mégse
            </Button>
            <Button type="submit" disabled={pending || betolt || !adat?.ok || hianyos}>
              Lezárás megerősítése
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
