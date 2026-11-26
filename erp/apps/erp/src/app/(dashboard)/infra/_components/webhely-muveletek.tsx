"use client";

import { useState } from "react";
import { Button, Input } from "@erp/ui";
import { ellenorizWebhelyAction, torolWebhelyAction } from "../actions";
import { useMuvelet } from "./muveletek";

export function WebhelyEllenorzes({ id }: { id: string }) {
  const { pending, futtat } = useMuvelet();
  return (
    <Button
      variant="outline"
      loading={pending}
      title="Csak olvas: megnyitja a webhelyet HTTPS-en, és megnézi, WordPress-ként válaszol-e. Nem lép be sehova."
      onClick={() => futtat(() => ellenorizWebhelyAction(id))}
    >
      Állapot ellenőrzése
    </Button>
  );
}

export function WebhelyTorles({ id, nev, db }: { id: string; nev: string; db: number }) {
  const [megerosit, setMegerosit] = useState("");
  const { pending, futtat } = useMuvelet();
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        A nyilvántartásból törli a webhelyet
        {db > 0 ? ` és a hozzá tartozó ${db} eltárolt belépést` : ""}. A tényleges
        oldalhoz nem nyúl.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder={`Írd be a webhely nevét: ${nev}`}
          value={megerosit}
          onChange={(e) => setMegerosit(e.target.value)}
        />
        <Button
          variant="destructive"
          loading={pending}
          disabled={megerosit.trim() !== nev}
          onClick={() => futtat(() => torolWebhelyAction(id), "/infra/webhelyek")}
        >
          Webhely törlése
        </Button>
      </div>
    </div>
  );
}
