"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input } from "@erp/ui";
import {
  addLejaratAction,
  archivalTelepitesAction,
  beallitSzamlazasAction,
  deleteTelepitesAction,
  felfuggesztTelepitesAction,
  removeLejaratAction,
  visszaallitTelepitesAction,
  type MuveletAllapot,
} from "../actions";

const SELECT =
  "border-input bg-background h-9 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none";

function useMuvelet() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const futtat = (f: () => Promise<MuveletAllapot>, utana?: string) =>
    start(async () => {
      const r = await f();
      if (r.success) {
        toast.success(r.message);
        if (utana) router.push(utana);
        else router.refresh();
      } else toast.error(r.message ?? "A művelet nem sikerült.");
    });
  return { pending, futtat };
}

export function ArchivalGombok({
  id,
  archivalt,
  felfuggesztve,
  torolheto,
  szerkesztheto,
  torolhet,
}: {
  id: string;
  archivalt: boolean;
  felfuggesztve: boolean;
  torolheto: boolean;
  szerkesztheto: boolean;
  torolhet: boolean;
}) {
  const { pending, futtat } = useMuvelet();
  const [ok, setOk] = useState("");
  if (!szerkesztheto) return null;
  return (
    <div className="flex flex-col gap-3">
      {archivalt ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => futtat(() => visszaallitTelepitesAction(id))}
        >
          Visszaállítás
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => futtat(() => felfuggesztTelepitesAction(id, !felfuggesztve))}
          >
            {felfuggesztve ? "Felfüggesztés feloldása" : "Felfüggesztés"}
          </Button>
          <div className="flex gap-2">
            <Input
              placeholder="Archiválás oka (kötelező)"
              value={ok}
              onChange={(e) => setOk(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={pending || !ok.trim()}
              onClick={() => futtat(() => archivalTelepitesAction(id, ok))}
            >
              Archiválás
            </Button>
          </div>
        </>
      )}
      {torolhet && torolheto && (
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (
              window.confirm(
                "Biztosan véglegesen törlöd ezt az el nem indított telepítést?",
              )
            )
              futtat(() => deleteTelepitesAction(id), "/telepitesek");
          }}
        >
          Végleges törlés
        </Button>
      )}
    </div>
  );
}

export function LejaratUrlap({ id }: { id: string }) {
  const { pending, futtat } = useMuvelet();
  const [tipus, setTipus] = useState<"domain" | "hosting" | "ssl">("domain");
  const [cimke, setCimke] = useState("");
  const [lejarat, setLejarat] = useState("");
  return (
    <div className="flex flex-wrap gap-2" data-export="skip">
      <select
        className={SELECT}
        value={tipus}
        onChange={(e) => setTipus(e.target.value as typeof tipus)}
      >
        <option value="domain">Domain</option>
        <option value="hosting">Hosting</option>
        <option value="ssl">SSL</option>
      </select>
      <Input
        className="w-48"
        placeholder="Megnevezés"
        value={cimke}
        onChange={(e) => setCimke(e.target.value)}
      />
      <Input
        className="w-40"
        type="date"
        value={lejarat}
        onChange={(e) => setLejarat(e.target.value)}
      />
      <Button
        disabled={pending || !cimke.trim()}
        onClick={() =>
          futtat(async () => {
            const r = await addLejaratAction(id, {
              tipus,
              cimke,
              lejarat: lejarat || undefined,
            });
            if (r.success) {
              setCimke("");
              setLejarat("");
            }
            return r;
          })
        }
      >
        Hozzáadás
      </Button>
    </div>
  );
}

export function LejaratTorles({ id, lejaratId }: { id: string; lejaratId: string }) {
  const { pending, futtat } = useMuvelet();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => futtat(() => removeLejaratAction(id, lejaratId))}
    >
      Törlés
    </Button>
  );
}

export function SzamlazasUrlap({
  id,
  csomagok,
  csomagId,
  ciklus,
  ar,
}: {
  id: string;
  csomagok: Array<{ id: string; nev: string }>;
  csomagId?: string;
  ciklus?: string;
  ar?: number;
}) {
  const { pending, futtat } = useMuvelet();
  const [c, setC] = useState(csomagId ?? "");
  const [cik, setCik] = useState(ciklus ?? "");
  const [a, setA] = useState(ar === undefined ? "" : String(ar));
  const [kezdet, setKezdet] = useState<"azonnal" | "kovetkezo_honap">("azonnal");
  return (
    <div className="flex flex-wrap items-end gap-2" data-export="skip">
      <select className={SELECT} value={c} onChange={(e) => setC(e.target.value)}>
        <option value="">— nincs csomag —</option>
        {csomagok.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nev}
          </option>
        ))}
      </select>
      <select className={SELECT} value={cik} onChange={(e) => setCik(e.target.value)}>
        <option value="">Ciklus: a csomagé</option>
        <option value="havi">Havi</option>
        <option value="negyedeves">Negyedéves</option>
        <option value="eves">Éves</option>
      </select>
      <Input
        className="w-36"
        type="number"
        placeholder="Ár felülírása"
        value={a}
        onChange={(e) => setA(e.target.value)}
      />
      <select
        className={SELECT}
        value={kezdet}
        onChange={(e) => setKezdet(e.target.value as typeof kezdet)}
      >
        <option value="azonnal">Számlázás: azonnal</option>
        <option value="kovetkezo_honap">Következő hónap 1.</option>
      </select>
      <Button
        disabled={pending}
        onClick={() =>
          futtat(() =>
            beallitSzamlazasAction(id, {
              csomagId: c || null,
              szamlazasiCiklus: (cik || null) as "havi" | null,
              arFelulirasHuf: a === "" ? null : Number(a),
              kezdet,
            }),
          )
        }
      >
        Mentés
      </Button>
    </div>
  );
}
