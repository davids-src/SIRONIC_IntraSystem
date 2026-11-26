"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@erp/ui";
import {
  RAKTARHELY_TIPUSOK,
  RAKTARHELY_TIPUS_LABELS,
  type RaktarhelyDto,
  type RaktarhelyTipus,
} from "@erp/keszlet/client";
import { createRaktarhelyAction, deleteRaktarhelyAction } from "../../actions";
import { SELECT_CLASS, toastResult } from "../../_components/run";

export function RaktarhelyKezelo({
  helyek,
  szerkesztheto,
}: {
  helyek: RaktarhelyDto[];
  szerkesztheto: boolean;
}) {
  const router = useRouter();
  const [kod, setKod] = useState("");
  const [nev, setNev] = useState("");
  const [tipus, setTipus] = useState<RaktarhelyTipus>("polc");
  const [pending, start] = useTransition();

  const hozzaad = () =>
    start(async () => {
      if (toastResult(await createRaktarhelyAction({ kod, nev, tipus }))) {
        setKod("");
        setNev("");
        router.refresh();
      }
    });
  const torol = (id: string) =>
    start(async () => {
      if (toastResult(await deleteRaktarhelyAction(id))) router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      {szerkesztheto && (
        <section className="bg-card grid grid-cols-1 items-end gap-3 rounded-xl border p-5 shadow-sm sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="rh-kod">Kód</Label>
            <Input
              id="rh-kod"
              value={kod}
              placeholder="FO/A"
              onChange={(e) => setKod(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="rh-nev">Név</Label>
            <Input id="rh-nev" value={nev} onChange={(e) => setNev(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="rh-tipus">Típus</Label>
            <select
              id="rh-tipus"
              className={SELECT_CLASS}
              value={tipus}
              onChange={(e) => setTipus(e.target.value as RaktarhelyTipus)}
            >
              {RAKTARHELY_TIPUSOK.map((t) => (
                <option key={t} value={t}>
                  {RAKTARHELY_TIPUS_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={hozzaad} loading={pending} disabled={pending || !kod || !nev}>
            Felvétel
          </Button>
        </section>
      )}
      <section className="bg-card overflow-hidden rounded-xl border shadow-sm">
        {helyek.length === 0 ? (
          <p className="text-muted-foreground p-5 text-sm">Még nincs raktárhely.</p>
        ) : (
          <ul className="divide-y text-sm">
            {helyek.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 px-4 py-2"
              >
                <span style={{ paddingLeft: `${h.szint * 1.25}rem` }}>
                  <span className="font-mono font-medium">{h.kod}</span> — {h.nev}{" "}
                  <span className="text-muted-foreground">
                    ({RAKTARHELY_TIPUS_LABELS[h.tipus]}, {h.tetelDb} tétel)
                  </span>
                </span>
                {szerkesztheto && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => torol(h.id)}
                  >
                    Törlés
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
