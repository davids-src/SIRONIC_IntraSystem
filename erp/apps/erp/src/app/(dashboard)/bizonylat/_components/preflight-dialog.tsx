"use client";

import { useState, useTransition } from "react";
import { CheckCircle2Icon, TriangleAlertIcon } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@erp/ui";
import type { SzallitolevelPreflight } from "@erp/bizonylat/client";
import { preflightSzallitolevelAction } from "../actions";

const FT = new Intl.NumberFormat("hu-HU");

/** Availability check before issuing: stock per line and likely duplicate notes. */
export function PreflightDialog({ id }: { id: string }) {
  const [nyitva, setNyitva] = useState(false);
  const [adat, setAdat] = useState<SzallitolevelPreflight | null>(null);
  const [hiba, setHiba] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function megnyit() {
    setNyitva(true);
    setAdat(null);
    setHiba(null);
    start(async () => {
      const r = await preflightSzallitolevelAction(id);
      if (r.ok) setAdat(r.adat);
      else setHiba(r.message);
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={megnyit}>
        Elérhetőség ellenőrzése
      </Button>
      <Dialog open={nyitva} onOpenChange={setNyitva}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kiadás előtti ellenőrzés</DialogTitle>
            <DialogDescription>
              Készletelérhetőség tételenként, és az azonos partnerhez ugyanarra a napra
              felvett szállítólevelek.
            </DialogDescription>
          </DialogHeader>
          {pending && <p className="text-muted-foreground text-sm">Ellenőrzés…</p>}
          {hiba && <p className="text-destructive text-sm">{hiba}</p>}
          {adat && (
            <div className="flex flex-col gap-4 text-sm">
              <p className="flex items-center gap-2">
                {adat.osszesElegendo ? (
                  <>
                    <CheckCircle2Icon className="size-4 text-green-600" />
                    Minden tételből van elég készlet.
                  </>
                ) : (
                  <>
                    <TriangleAlertIcon className="size-4 text-amber-600" />
                    Legalább egy tételből nincs elég készlet — a kiadás nem engedélyezett.
                  </>
                )}
              </p>
              <table className="w-full">
                <thead className="text-muted-foreground text-left text-xs">
                  <tr>
                    <th className="p-1">Tétel</th>
                    <th className="p-1 text-right">Kért</th>
                    <th className="p-1 text-right">Szabad</th>
                    <th className="p-1">Eredmény</th>
                  </tr>
                </thead>
                <tbody>
                  {adat.sorok.map((s) => (
                    <tr key={s.lineIndex} className="border-t">
                      <td className="p-1">{s.nev ?? s.arlistaTermekId}</td>
                      <td className="p-1 text-right">{FT.format(s.kert)}</td>
                      <td className="p-1 text-right">{FT.format(s.szabad)}</td>
                      <td className="p-1">
                        {s.elegendo ? "Rendben" : (s.uzenet ?? "Nincs elég készlet")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adat.duplikaciok.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
                  <p className="font-medium">Lehetséges kettős felvétel</p>
                  <ul className="mt-1 list-disc pl-5">
                    {adat.duplikaciok.map((d) => (
                      <li key={d.id}>
                        <a
                          className="underline"
                          href={`/bizonylat/szallitolevelek/${d.id}`}
                        >
                          {d.azonosito}
                        </a>{" "}
                        — azonos partner és nap
                        {d.kozosTermekek.length > 0 &&
                          `, közös tétel: ${d.kozosTermekek.join(", ")}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
