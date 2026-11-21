"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@erp/ui";
import { leltarInditasAction } from "../../actions";
import { SELECT_CLASS, toastResult } from "../../_components/run";

export function UjLeltar({ helyek }: { helyek: Array<{ kod: string; nev: string }> }) {
  const router = useRouter();
  const [hely, setHely] = useState(helyek[0]?.kod ?? "");
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Raktárhely"
        className={SELECT_CLASS}
        value={hely}
        onChange={(e) => setHely(e.target.value)}
      >
        <option value="">Nincs raktárhelyhez rendelve</option>
        {helyek.map((h) => (
          <option key={h.kod} value={h.kod}>
            {h.kod} — {h.nev}
          </option>
        ))}
      </select>
      <Button
        loading={pending}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await leltarInditasAction(hely);
            if (toastResult(r) && r.id) router.push(`/keszlet/leltar/${r.id}`);
          })
        }
      >
        Leltár indítása
      </Button>
    </div>
  );
}
