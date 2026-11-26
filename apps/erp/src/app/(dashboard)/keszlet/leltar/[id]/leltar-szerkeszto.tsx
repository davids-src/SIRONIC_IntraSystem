"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@erp/ui";
import type { LeltarDetail } from "@erp/keszlet/client";
import { leltarLezarAction, leltarSorAction } from "../../actions";
import { toastResult } from "../../_components/run";

type Draft = { tenyleges: string; indoklas: string };

/** Count sheet: expected vs counted per line; a difference needs a justification before closing. */
export function LeltarSzerkeszto({
  leltar,
  szerkesztheto,
}: {
  leltar: LeltarDetail;
  szerkesztheto: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Record<number, Draft>>(() =>
    Object.fromEntries(
      leltar.sorok.map((s) => [
        s.lineIndex,
        {
          tenyleges: s.tenyleges === null ? "" : String(s.tenyleges),
          indoklas: s.indoklas ?? "",
        },
      ]),
    ),
  );
  const [pending, start] = useTransition();

  const ment = (i: number) =>
    start(async () => {
      const d = draft[i]!;
      toastResult(
        await leltarSorAction(leltar.id, i, {
          tenyleges: d.tenyleges,
          indoklas: d.indoklas,
        }),
      );
      router.refresh();
    });
  const lezar = () =>
    start(async () => {
      if (toastResult(await leltarLezarAction(leltar.id))) router.refresh();
    });

  return (
    <section className="bg-card overflow-x-auto rounded-xl border shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2">Termék</th>
            <th className="px-3 py-2">Várt</th>
            <th className="px-3 py-2">Számolt</th>
            <th className="px-3 py-2">Eltérés</th>
            <th className="px-3 py-2">Indoklás</th>
            {szerkesztheto && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody>
          {leltar.sorok.map((s) => {
            const d = draft[s.lineIndex]!;
            const kulonbseg = d.tenyleges === "" ? null : Number(d.tenyleges) - s.elvart;
            return (
              <tr key={s.lineIndex} className="border-t">
                <td className="px-3 py-2">
                  <div className="font-medium">{s.nev}</div>
                  <div className="text-muted-foreground text-xs">{s.kod}</div>
                </td>
                <td className="px-3 py-2">
                  {s.elvart} {s.egyseg}
                </td>
                <td className="px-3 py-2">
                  {szerkesztheto ? (
                    <Input
                      className="w-24"
                      type="number"
                      min={0}
                      step="any"
                      value={d.tenyleges}
                      onChange={(e) =>
                        setDraft((x) => ({
                          ...x,
                          [s.lineIndex]: { ...d, tenyleges: e.target.value },
                        }))
                      }
                    />
                  ) : (
                    (s.tenyleges ?? "—")
                  )}
                </td>
                <td
                  className={
                    kulonbseg && kulonbseg !== 0
                      ? "px-3 py-2 font-semibold text-red-600"
                      : "px-3 py-2"
                  }
                >
                  {kulonbseg === null ? "—" : kulonbseg > 0 ? `+${kulonbseg}` : kulonbseg}
                </td>
                <td className="px-3 py-2">
                  {szerkesztheto ? (
                    <Input
                      value={d.indoklas}
                      placeholder={kulonbseg ? "Kötelező eltérésnél" : ""}
                      onChange={(e) =>
                        setDraft((x) => ({
                          ...x,
                          [s.lineIndex]: { ...d, indoklas: e.target.value },
                        }))
                      }
                    />
                  ) : (
                    (s.indoklas ?? "")
                  )}
                </td>
                {szerkesztheto && (
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending || d.tenyleges === ""}
                      onClick={() => ment(s.lineIndex)}
                    >
                      Mentés
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {szerkesztheto && (
        <div className="flex justify-end gap-2 border-t p-3">
          <Button onClick={lezar} loading={pending} disabled={pending}>
            Leltár lezárása és korrekciók rögzítése
          </Button>
        </div>
      )}
    </section>
  );
}
