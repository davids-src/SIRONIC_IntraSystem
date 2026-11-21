"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@erp/ui";
import type { BeszerzesiAdatDto } from "@erp/arlista/client";
import {
  addBeszerzesAction,
  removeBeszerzesAction,
  type ArlistaFormState,
} from "../../actions";
import { TextAreaField, TextField, useFormEffects } from "../../_components/form-bits";

const FT = new Intl.NumberFormat("hu-HU");
const initial: ArlistaFormState = { success: false };

/** Secret purchase records — the page only renders this for viewers the facade returned them to. */
export function BeszerzesPanel({
  termekId,
  adatok,
  utolsoBeszerzesiAr,
  elonyosBeszallito,
  canWrite,
}: {
  termekId: string;
  adatok: BeszerzesiAdatDto[];
  utolsoBeszerzesiAr?: number;
  elonyosBeszallito?: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(addBeszerzesAction.bind(null, termekId), initial);
  const [torles, startTorles] = useTransition();
  useFormEffects(state);

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Utolsó beszerzési ár</dt>
          <dd className="font-medium">
            {utolsoBeszerzesiAr != null ? `${FT.format(utolsoBeszerzesiAr)} Ft` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Kedvelt beszállító</dt>
          <dd className="font-medium">{elonyosBeszallito ?? "—"}</dd>
        </div>
      </dl>

      {adatok.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left">
              <th className="py-2">Dátum</th>
              <th>Beszállító</th>
              <th>Cikkszám</th>
              <th className="text-right">Nettó beszerzési ár</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {adatok.map((b) => (
              <tr key={b._id} className="border-b">
                <td className="py-2">{new Date(b.beszerzesDatuma).toLocaleDateString("hu-HU")}</td>
                <td>{b.beszallitoNev}</td>
                <td>{b.beszallitoCikkszam ?? ""}</td>
                <td className="text-right tabular-nums">{FT.format(b.nettoBeszerzesiAr)} Ft</td>
                <td className="text-right">
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={torles}
                      onClick={() =>
                        startTorles(async () => {
                          const r = await removeBeszerzesAction(termekId, b._id);
                          if (!r.success && r.message) toast.error(r.message);
                          router.refresh();
                        })
                      }
                    >
                      Törlés
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted-foreground text-sm">Még nincs rögzített beszerzés.</p>
      )}

      {canWrite && (
        <form action={action} className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
          <TextField label="Beszállító" name="beszallitoNev" state={state} required />
          <TextField label="Beszállítói cikkszám" name="beszallitoCikkszam" state={state} />
          <TextField
            label="Nettó beszerzési ár"
            name="nettoBeszerzesiAr"
            state={state}
            type="number"
            step="any"
            required
          />
          <TextField label="Beszerzés dátuma" name="beszerzesDatuma" state={state} type="date" required />
          <div className="sm:col-span-2">
            <TextAreaField label="Megjegyzés" name="megjegyzes" state={state} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={pending} disabled={pending}>
              Beszerzés rögzítése
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
