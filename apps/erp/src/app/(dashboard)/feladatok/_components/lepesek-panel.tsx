"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button, Checkbox, Input, cn } from "@erp/ui";
import { FELADAT_LEPES_MAX, FELADAT_LEPES_NEV_MAX } from "@erp/feladat/client";
import type { FeladatSor } from "@erp/feladat";
import {
  feladatLepesJelolesAction,
  feladatLepesekAction,
  lepesSablonAlkalmazasAction,
  lepesSablonMentesAction,
  lepesSablonTorlesAction,
} from "../actions";

type Lepes = FeladatSor["lepesek"][number];
type Sablon = { id: string; nev: string; lepesek: string[] };
type Eredmeny = { success: boolean; message?: string };

const nap = (ymd: string) => ymd.replaceAll("-", ". ") + ".";

/**
 * The felelős's own steps on a task (#50): tick them off one by one, edit the list (add,
 * rename, reorder, deadline, remove), save it as a personal template or apply one. Everyone
 * else who sees the task sees the steps read-only.
 */
export function LepesekPanel({
  feladatId,
  lepesek,
  szerkesztheto,
  sablonok,
}: {
  feladatId: string;
  lepesek: Lepes[];
  szerkesztheto: boolean;
  sablonok: Sablon[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [szerkeszt, setSzerkeszt] = useState(false);
  const [vazlat, setVazlat] = useState<Lepes[]>(lepesek);
  const [sablonNev, setSablonNev] = useState("");
  const [sablonId, setSablonId] = useState("");
  const aktualis = lepesek.findIndex((l) => !l.kesz);
  const kesz = lepesek.filter((l) => l.kesz).length;

  const run = (fn: () => Promise<Eredmeny>, utana?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      if (r.success) {
        if (r.message) toast.success(r.message);
        utana?.();
        router.refresh();
      } else toast.error(r.message ?? "Nem sikerült.");
    });

  const mozgat = (i: number, d: -1 | 1) =>
    setVazlat((v) => {
      const j = i + d;
      if (j < 0 || j >= v.length) return v;
      const out = [...v];
      [out[i], out[j]] = [out[j]!, out[i]!];
      return out;
    });

  if (szerkeszt) {
    return (
      <div className="flex flex-col gap-2">
        <ol className="flex flex-col gap-1.5">
          {vazlat.map((l, i) => (
            <li key={i} className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground w-5 text-right text-xs tabular-nums">
                {i + 1}.
              </span>
              <Input
                value={l.nev}
                maxLength={FELADAT_LEPES_NEV_MAX}
                onChange={(e) =>
                  setVazlat((v) =>
                    v.map((x, k) => (k === i ? { ...x, nev: e.target.value } : x)),
                  )
                }
                placeholder="Lépés neve"
                aria-label={`${i + 1}. lépés neve`}
                className="h-8 min-w-0 flex-1"
              />
              <Input
                type="date"
                value={l.hatarido ?? ""}
                onChange={(e) =>
                  setVazlat((v) =>
                    v.map((x, k) =>
                      k === i ? { ...x, hatarido: e.target.value || undefined } : x,
                    ),
                  )
                }
                aria-label={`${i + 1}. lépés határideje`}
                className="h-8 w-36"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => mozgat(i, -1)}
                aria-label="Feljebb"
              >
                <ArrowUpIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => mozgat(i, 1)}
                aria-label="Lejjebb"
              >
                <ArrowDownIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setVazlat((v) => v.filter((_, k) => k !== i))}
                aria-label="Lépés törlése"
              >
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={vazlat.length >= FELADAT_LEPES_MAX}
            onClick={() => setVazlat((v) => [...v, { nev: "", kesz: false }])}
          >
            <PlusIcon className="h-4 w-4" aria-hidden /> Új lépés
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  feladatLepesekAction(
                    feladatId,
                    vazlat.filter((l) => l.nev.trim()),
                  ),
                () => setSzerkeszt(false),
              )
            }
          >
            Mentés
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setVazlat(lepesek);
              setSzerkeszt(false);
            }}
          >
            Mégse
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {lepesek.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {szerkesztheto
            ? "Bontsd lépésekre a feladatot — az aktuális lépés a listákban állapotként látszik."
            : "A felelős nem vett fel lépéseket."}
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full" aria-hidden>
              <div
                className="bg-success h-full rounded-full"
                style={{ width: `${Math.round((kesz / lepesek.length) * 100)}%` }}
              />
            </div>
            <span className="text-xs tabular-nums">
              {kesz} / {lepesek.length}
            </span>
          </div>
          <ol className="flex flex-col gap-1">
            {lepesek.map((l, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 text-sm",
                  i === aktualis && "bg-warning-soft font-medium",
                )}
              >
                <Checkbox
                  checked={l.kesz}
                  disabled={!szerkesztheto || pending}
                  onCheckedChange={(v) =>
                    run(() => feladatLepesJelolesAction(feladatId, i, v === true))
                  }
                  aria-label={`${l.nev} kész`}
                />
                <span
                  className={cn("flex-1", l.kesz && "text-muted-foreground line-through")}
                >
                  {i + 1}. {l.nev}
                </span>
                {i === aktualis && <span className="text-warning text-xs">aktuális</span>}
                {l.hatarido && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {nap(l.hatarido)}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </>
      )}

      {szerkesztheto && (
        <div className="flex flex-col gap-2 border-t pt-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setVazlat(lepesek.length ? lepesek : [{ nev: "", kesz: false }]);
                setSzerkeszt(true);
              }}
            >
              {lepesek.length ? "Lépések szerkesztése" : "Lépések felvétele"}
            </Button>
          </div>
          {sablonok.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={sablonId}
                onChange={(e) => setSablonId(e.target.value)}
                className="border-input bg-background h-8 rounded-md border px-2 text-sm"
                aria-label="Lépéssablon"
              >
                <option value="">Saját sablon választása…</option>
                {sablonok.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nev} ({s.lepesek.length} lépés)
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!sablonId || pending}
                onClick={() =>
                  run(() => lepesSablonAlkalmazasAction(feladatId, sablonId))
                }
              >
                Hozzáadom
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={!sablonId || pending}
                onClick={() =>
                  run(
                    () => lepesSablonTorlesAction(sablonId),
                    () => setSablonId(""),
                  )
                }
              >
                Sablon törlése
              </Button>
            </div>
          )}
          {lepesek.length > 0 && (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () =>
                    lepesSablonMentesAction({
                      nev: sablonNev,
                      lepesek: lepesek.map((l) => l.nev),
                    }),
                  () => setSablonNev(""),
                );
              }}
            >
              <Input
                value={sablonNev}
                onChange={(e) => setSablonNev(e.target.value)}
                placeholder="Sablon neve"
                maxLength={100}
                className="h-8 w-48"
                aria-label="Sablon neve"
              />
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                disabled={!sablonNev.trim() || pending}
              >
                Mentés sablonként
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
