"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@erp/ui";
import type { HetiTervSor } from "@erp/projekt";
import {
  HETI_ALLAPOTOK,
  HETI_ALLAPOT_LABELS,
  HETI_ALLAPOT_TONES,
  PRIORITASOK,
  PRIORITAS_LABELS,
  PRIORITAS_TONES,
  hetCimke,
  hetEltolas,
  type Prioritas,
} from "@erp/projekt/client";
import {
  archiveHetiTervAction,
  createHetiTervAction,
  restoreHetiTervAction,
  setHetiAllapotAction,
  updateHetiTervAction,
} from "../actions";
import { ArchivGombok, useMuvelet } from "./kozos";
import { SELECT_CLASS, datum } from "./layout";

type Felhasznalo = { id: string; name: string };
type ProjektOpcio = { id: string; azonosito: string; nev: string };

const PRIO_SULY: Record<Prioritas, number> = {
  surgos: 0,
  magas: 1,
  kozepes: 2,
  alacsony: 3,
};

function TervDialog({
  open,
  onClose,
  terv,
  ev,
  het,
  felhasznalok,
  projektek,
  sajatId,
  delegalhat,
}: {
  open: boolean;
  onClose: () => void;
  terv?: HetiTervSor;
  ev: number;
  het: number;
  felhasznalok: Felhasznalo[];
  projektek: ProjektOpcio[];
  sajatId: string;
  delegalhat: boolean;
}) {
  const { futtat, pending } = useMuvelet();
  const [cim, setCim] = useState(terv?.cim ?? "");
  const [leiras, setLeiras] = useState(terv?.leiras ?? "");
  const [felelosId, setFelelosId] = useState(terv?.felelosId ?? sajatId);
  const [prioritas, setPrioritas] = useState<Prioritas>(terv?.prioritas ?? "kozepes");
  const [hatarido, setHatarido] = useState(terv?.hatarido ?? "");
  const [projektId, setProjektId] = useState(terv?.projektId ?? "");
  const [hibajegyId, setHibajegyId] = useState(terv?.hibajegyId ?? "");
  const [munkalapId, setMunkalapId] = useState(terv?.munkalapId ?? "");

  const input = {
    felelosId,
    cim,
    leiras: leiras || undefined,
    ev,
    het,
    prioritas,
    hatarido: hatarido || undefined,
    projektId: projektId || undefined,
    hibajegyId: hibajegyId || undefined,
    munkalapId: munkalapId || undefined,
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{terv ? "Heti terv szerkesztése" : "Új heti terv"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ht-cim">Cím *</Label>
            <Input id="ht-cim" value={cim} onChange={(e) => setCim(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ht-leiras">Leírás</Label>
            <Textarea
              id="ht-leiras"
              rows={2}
              value={leiras}
              onChange={(e) => setLeiras(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="ht-felelos">Felelős</Label>
              <select
                id="ht-felelos"
                className={SELECT_CLASS}
                value={felelosId}
                disabled={!delegalhat}
                onChange={(e) => setFelelosId(e.target.value)}
              >
                {(delegalhat
                  ? felhasznalok
                  : felhasznalok.filter((u) => u.id === sajatId)
                ).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ht-prio">Prioritás</Label>
              <select
                id="ht-prio"
                className={SELECT_CLASS}
                value={prioritas}
                onChange={(e) => setPrioritas(e.target.value as Prioritas)}
              >
                {PRIORITASOK.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITAS_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ht-hat">Határidő</Label>
              <Input
                id="ht-hat"
                type="date"
                value={hatarido}
                onChange={(e) => setHatarido(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ht-projekt">Projekt</Label>
              <select
                id="ht-projekt"
                className={SELECT_CLASS}
                value={projektId}
                onChange={(e) => setProjektId(e.target.value)}
              >
                <option value="">— nincs —</option>
                {projektek.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.azonosito} — {p.nev}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ht-hibajegy">Hibajegy azonosító</Label>
              <Input
                id="ht-hibajegy"
                value={hibajegyId}
                onChange={(e) => setHibajegyId(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="ht-munkalap">Munkalap azonosító</Label>
              <Input
                id="ht-munkalap"
                value={munkalapId}
                onChange={(e) => setMunkalapId(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              Mégse
            </Button>
            <Button
              loading={pending}
              disabled={pending || !cim.trim()}
              onClick={() =>
                futtat(
                  () =>
                    terv
                      ? updateHetiTervAction(terv.id, input)
                      : createHetiTervAction(input),
                  onClose,
                )
              }
            >
              Mentés
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Kartya({
  terv,
  szerkeszthet,
  onSzerkeszt,
  projektNevek,
}: {
  terv: HetiTervSor;
  szerkeszthet: boolean;
  onSzerkeszt: () => void;
  projektNevek: Map<string, string>;
}) {
  const { futtat, pending } = useMuvelet();
  return (
    <div className="bg-card flex flex-col gap-2 rounded-lg border p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="text-left font-medium hover:underline disabled:no-underline"
          disabled={!szerkeszthet || terv.archivalt}
          onClick={onSzerkeszt}
        >
          {terv.cim}
        </button>
        <Badge variant={PRIORITAS_TONES[terv.prioritas]}>
          {PRIORITAS_LABELS[terv.prioritas]}
        </Badge>
      </div>
      <span className="text-muted-foreground text-xs">{terv.felelosNev}</span>
      {terv.hatarido && (
        <span className="text-muted-foreground text-xs">
          Határidő: {datum(terv.hatarido)}
        </span>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        {terv.projektId && (
          <Link href={`/projekt/${terv.projektId}`} className="underline">
            {projektNevek.get(terv.projektId) ?? "Projekt"}
          </Link>
        )}
        {terv.hibajegyId && <span>Hibajegy: {terv.hibajegyId}</span>}
        {terv.munkalapId && <span>Munkalap: {terv.munkalapId}</span>}
      </div>
      {terv.archivalt ? (
        <ArchivGombok
          kompakt
          alany="terv"
          archivalt
          ok={terv.archivalasOka}
          onRestore={szerkeszthet ? () => restoreHetiTervAction(terv.id) : undefined}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Állapot"
            className={`${SELECT_CLASS} !h-8 !w-auto`}
            value={terv.allapot}
            disabled={!szerkeszthet || pending}
            onChange={(e) =>
              futtat(() =>
                setHetiAllapotAction(terv.id, e.target.value as typeof terv.allapot),
              )
            }
          >
            {HETI_ALLAPOTOK.map((a) => (
              <option key={a} value={a}>
                {HETI_ALLAPOT_LABELS[a]}
              </option>
            ))}
          </select>
          {szerkeszthet && (
            <ArchivGombok
              kompakt
              alany="terv"
              archivalt={false}
              onArchive={(ok) => archiveHetiTervAction(terv.id, ok)}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function HetiBoard({
  tervek,
  ev,
  het,
  felhasznalok,
  projektek,
  sajatId,
  delegalhat,
  irhat,
  felelosSzuro,
  archivaltakkal,
}: {
  tervek: HetiTervSor[];
  ev: number;
  het: number;
  felhasznalok: Felhasznalo[];
  projektek: ProjektOpcio[];
  sajatId: string;
  delegalhat: boolean;
  irhat: boolean;
  felelosSzuro: string;
  archivaltakkal: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<{ terv?: HetiTervSor } | null>(null);
  const projektNevek = new Map(projektek.map((p) => [p.id, p.azonosito]));

  const href = (
    h: { ev: number; het: number },
    extra?: { felelos?: string; archivalt?: boolean },
  ) => {
    const p = new URLSearchParams({ ev: String(h.ev), het: String(h.het) });
    const f = extra?.felelos ?? felelosSzuro;
    if (f) p.set("felelos", f);
    if (extra?.archivalt ?? archivaltakkal) p.set("archivalt", "1");
    return `/projekt/heti-terv?${p.toString()}`;
  };
  const elozo = hetEltolas({ ev, het }, -1);
  const kovetkezo = hetEltolas({ ev, het }, 1);

  const jogosult = (t: HetiTervSor) => irhat && (delegalhat || t.felelosId === sajatId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={href(elozo)} aria-label="Előző hét">
            <ChevronLeftIcon className="size-4" />
          </Link>
        </Button>
        <span className="min-w-28 text-center font-semibold">
          {hetCimke({ ev, het })}
        </span>
        <Button asChild variant="outline" size="sm">
          <Link href={href(kovetkezo)} aria-label="Következő hét">
            <ChevronRightIcon className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/projekt/heti-terv">Ez a hét</Link>
        </Button>
        <select
          aria-label="Felelős szűrő"
          className={`${SELECT_CLASS} !w-auto`}
          value={felelosSzuro}
          onChange={(e) => router.push(href({ ev, het }, { felelos: e.target.value }))}
        >
          <option value="">Mindenki</option>
          {felhasznalok.map((u) => (
            <option key={u.id} value={u.id}>
              {u.id === sajatId ? `${u.name} (én)` : u.name}
            </option>
          ))}
        </select>
        <Button asChild variant="outline" size="sm">
          <Link href={href({ ev, het }, { archivalt: !archivaltakkal })}>
            {archivaltakkal ? "Archiváltak elrejtése" : "Archiváltak mutatása"}
          </Link>
        </Button>
        {irhat && (
          <Button className="ml-auto" onClick={() => setDialog({})}>
            Új heti terv
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {HETI_ALLAPOTOK.map((a) => {
          const oszlop = tervek
            .filter((t) => t.allapot === a)
            .sort((x, y) => PRIO_SULY[x.prioritas] - PRIO_SULY[y.prioritas]);
          return (
            <div key={a} className="bg-muted/30 flex flex-col gap-2 rounded-lg p-2">
              <Badge variant={HETI_ALLAPOT_TONES[a]} className="w-fit">
                {HETI_ALLAPOT_LABELS[a]} · {oszlop.length}
              </Badge>
              {oszlop.map((t) => (
                <Kartya
                  key={t.id}
                  terv={t}
                  szerkeszthet={jogosult(t)}
                  projektNevek={projektNevek}
                  onSzerkeszt={() => setDialog({ terv: t })}
                />
              ))}
            </div>
          );
        })}
      </div>

      {dialog && (
        <TervDialog
          key={dialog.terv?.id ?? "uj"}
          open
          onClose={() => setDialog(null)}
          terv={dialog.terv}
          ev={ev}
          het={het}
          felhasznalok={felhasznalok}
          projektek={projektek}
          sajatId={sajatId}
          delegalhat={delegalhat}
        />
      )}
    </div>
  );
}
