"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { KategoriaAdminSor, KategoriaAdminEredmeny } from "@erp/feladat";
import { Badge, Button, Input } from "@erp/ui";
import {
  aktivKategoriaAction,
  atnevezKategoriaAction,
  hozzaadKategoriaAction,
  torolKategoriaAction,
} from "../actions";

export function KategoriaLista({ sorok }: { sorok: KategoriaAdminSor[] }) {
  const [pending, start] = useTransition();
  const [uj, setUj] = useState("");
  const [szerkeszt, setSzerkeszt] = useState<{ id: string; nev: string } | null>(null);

  const fut = (muvelet: () => Promise<KategoriaAdminEredmeny>, siker?: () => void) =>
    start(async () => {
      const r = await muvelet();
      if (r.ok) siker?.();
      else toast.error(r.message ?? "Nem sikerült");
    });

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          fut(
            () => hozzaadKategoriaAction(uj),
            () => setUj(""),
          );
        }}
      >
        <Input
          value={uj}
          onChange={(e) => setUj(e.target.value)}
          placeholder="Új kategória neve"
          maxLength={60}
          aria-label="Új kategória neve"
        />
        <Button type="submit" disabled={pending || !uj.trim()}>
          Hozzáadás
        </Button>
      </form>

      <ul className="divide-y rounded-lg border">
        {sorok.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            {szerkeszt?.id === s.id ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  fut(
                    () => atnevezKategoriaAction(s.id, szerkeszt.nev),
                    () => setSzerkeszt(null),
                  );
                }}
              >
                <Input
                  autoFocus
                  value={szerkeszt.nev}
                  onChange={(e) => setSzerkeszt({ id: s.id, nev: e.target.value })}
                  maxLength={60}
                  aria-label="Kategória neve"
                />
                <Button type="submit" size="sm" disabled={pending}>
                  Mentés
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSzerkeszt(null)}
                >
                  Mégse
                </Button>
              </form>
            ) : (
              <>
                <span
                  className={
                    s.aktiv ? "font-medium" : "text-muted-foreground line-through"
                  }
                >
                  {s.nev}
                </span>
                <Badge variant="neutral" className="whitespace-nowrap">
                  {s.db} feladat
                </Badge>
                {!s.aktiv && <Badge variant="warning">Inaktív</Badge>}
                <span className="ml-auto flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setSzerkeszt({ id: s.id, nev: s.nev })}
                  >
                    Átnevezés
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => fut(() => aktivKategoriaAction(s.id, !s.aktiv))}
                  >
                    {s.aktiv ? "Inaktiválás" : "Aktiválás"}
                  </Button>
                  {s.db === 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      disabled={pending}
                      onClick={() => fut(() => torolKategoriaAction(s.id))}
                    >
                      Törlés
                    </Button>
                  )}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">
        Az inaktivált kategória a már meglévő feladatokon megmarad, de újra nem
        választható. Csak olyan kategória törölhető, amelyet még egy feladat sem használ.
      </p>
    </div>
  );
}
