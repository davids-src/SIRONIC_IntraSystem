"use client";

import { useState } from "react";
import { ExternalLinkIcon, PaperclipIcon, Trash2Icon } from "lucide-react";
import { Badge, Button, Input, Label } from "@erp/ui";
import type { AlaprajzSor, ChecklistSor, FazisSor, StagingSor } from "@erp/projekt";
import {
  CHECKLIST_KATEGORIAK,
  CHECKLIST_KATEGORIA_LABELS,
  FAZIS_ALLAPOTOK,
  FAZIS_ALLAPOT_LABELS,
  FAZIS_ALLAPOT_TONES,
  JELOLO_TIPUS_LABELS,
  PROJEKT_ALLAPOT_LABELS,
  STAGING_JOVAHAGYASOK,
  STAGING_JOVAHAGYAS_LABELS,
  STAGING_JOVAHAGYAS_TONES,
  type FazisAllapot,
  type ProjektAllapot,
} from "@erp/projekt/client";
import {
  addChecklistTetelAction,
  addFazisAction,
  addMellekletAction,
  addStagingAction,
  archiveAlaprajzAction,
  createAlaprajzAction,
  removeChecklistTetelAction,
  removeFazisAction,
  removeMellekletAction,
  removeStagingAction,
  restoreAlaprajzAction,
  sablonAlkalmazAction,
  setAllapotAction,
  setChecklistKeszAction,
  setPortalLathatoAction,
  setStagingJovahagyasAction,
  updateFazisAction,
} from "../actions";
import { ArchivGombok, FajlFeltolto, mediaUrl, useMuvelet } from "./kozos";
import { EmptyNote, SELECT_CLASS, datum } from "./layout";

// ── Állapot és portál-kapcsoló ──────────────────────────────────────────────────────────────
const ATMENETEK: Record<ProjektAllapot, ProjektAllapot[]> = {
  nyitott: ["felfuggesztett", "lezart"],
  felfuggesztett: ["nyitott", "lezart"],
  lezart: ["nyitott"],
};
const ATMENET_GOMB: Record<ProjektAllapot, string> = {
  nyitott: "Újranyitás",
  felfuggesztett: "Felfüggesztés",
  lezart: "Lezárás",
};

export function AllapotGombok({
  id,
  allapot,
  portalLathato,
  archivalt,
}: {
  id: string;
  allapot: ProjektAllapot;
  portalLathato: boolean;
  archivalt: boolean;
}) {
  const { futtat, pending } = useMuvelet();
  if (archivalt) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ATMENETEK[allapot].map((to) => (
        <Button
          key={to}
          size="sm"
          variant={to === "lezart" ? "default" : "outline"}
          disabled={pending}
          title={PROJEKT_ALLAPOT_LABELS[to]}
          onClick={() => futtat(() => setAllapotAction(id, to))}
        >
          {ATMENET_GOMB[to]}
        </Button>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={portalLathato}
          disabled={pending}
          onChange={(e) => futtat(() => setPortalLathatoAction(id, e.target.checked))}
        />
        Látható a partnernek
      </label>
    </div>
  );
}

// ── Fázisok (Kanban-szerű) ──────────────────────────────────────────────────────────────────
function FazisKartya({
  id,
  fazis,
  szerkeszthet,
}: {
  id: string;
  fazis: FazisSor;
  szerkeszthet: boolean;
}) {
  const { futtat, pending } = useMuvelet();
  const [sz, setSz] = useState(String(fazis.szazalek));
  const mentes = (allapot: FazisAllapot, szazalek: string) =>
    futtat(() =>
      updateFazisAction(id, fazis.id, {
        nev: fazis.nev,
        allapot,
        szazalek,
        hatarido: fazis.hatarido,
      }),
    );
  return (
    <div className="bg-card flex flex-col gap-2 rounded-lg border p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{fazis.nev}</span>
        {szerkeszthet && (
          <button
            type="button"
            aria-label="Fázis törlése"
            className="text-muted-foreground hover:text-destructive"
            disabled={pending}
            onClick={() => futtat(() => removeFazisAction(id, fazis.id))}
          >
            <Trash2Icon className="size-4" />
          </button>
        )}
      </div>
      {fazis.hatarido && (
        <span className="text-muted-foreground text-xs">
          Határidő: {datum(fazis.hatarido)}
        </span>
      )}
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div className="bg-primary h-full" style={{ width: `${fazis.szazalek}%` }} />
      </div>
      <span className="text-muted-foreground text-xs">{fazis.szazalek}%</span>
      {szerkeszthet && (
        <div className="flex flex-wrap items-center gap-1">
          <select
            aria-label="Fázis állapota"
            className={`${SELECT_CLASS} !h-8 !w-auto`}
            value={fazis.allapot}
            disabled={pending}
            onChange={(e) => mentes(e.target.value as FazisAllapot, sz)}
          >
            {FAZIS_ALLAPOTOK.map((a) => (
              <option key={a} value={a}>
                {FAZIS_ALLAPOT_LABELS[a]}
              </option>
            ))}
          </select>
          <Input
            aria-label="Készültség százalék"
            type="number"
            min={0}
            max={100}
            className="!h-8 w-20"
            value={sz}
            onChange={(e) => setSz(e.target.value)}
            onBlur={() => sz !== String(fazis.szazalek) && mentes(fazis.allapot, sz)}
          />
        </div>
      )}
    </div>
  );
}

export function FazisokPanel({
  id,
  fazisok,
  szerkeszthet,
}: {
  id: string;
  fazisok: FazisSor[];
  szerkeszthet: boolean;
}) {
  const { futtat, pending } = useMuvelet();
  const [nev, setNev] = useState("");
  const [hatarido, setHatarido] = useState("");
  return (
    <div className="flex flex-col gap-3">
      {fazisok.length === 0 ? (
        <EmptyNote>Még nincs fázis.</EmptyNote>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {FAZIS_ALLAPOTOK.map((a) => (
            <div key={a} className="bg-muted/30 flex flex-col gap-2 rounded-lg p-2">
              <Badge variant={FAZIS_ALLAPOT_TONES[a]} className="w-fit">
                {FAZIS_ALLAPOT_LABELS[a]} ·{" "}
                {fazisok.filter((f) => f.allapot === a).length}
              </Badge>
              {fazisok
                .filter((f) => f.allapot === a)
                .map((f) => (
                  <FazisKartya key={f.id} id={id} fazis={f} szerkeszthet={szerkeszthet} />
                ))}
            </div>
          ))}
        </div>
      )}
      {szerkeszthet && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="fazis-nev">Új fázis</Label>
            <Input
              id="fazis-nev"
              value={nev}
              onChange={(e) => setNev(e.target.value)}
              placeholder="Fázis neve"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="fazis-hat">Határidő</Label>
            <Input
              id="fazis-hat"
              type="date"
              value={hatarido}
              onChange={(e) => setHatarido(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={pending || !nev.trim()}
            onClick={() =>
              futtat(
                () =>
                  addFazisAction(id, {
                    nev,
                    allapot: "fuggoben",
                    szazalek: 0,
                    hatarido: hatarido || undefined,
                  }),
                () => {
                  setNev("");
                  setHatarido("");
                },
              )
            }
          >
            Hozzáadás
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Ellenőrzőlista ──────────────────────────────────────────────────────────────────────────
function TetelSor({
  id,
  tetel,
  szerkeszthet,
}: {
  id: string;
  tetel: ChecklistSor;
  szerkeszthet: boolean;
}) {
  const { futtat, pending } = useMuvelet();
  const hianyzoMelleklet =
    tetel.mellekletKotelezo && tetel.mellekletMediaIds.length === 0;
  return (
    <li className="flex flex-col gap-1.5 rounded-md border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="checkbox"
          className="size-4"
          checked={tetel.kesz}
          disabled={!szerkeszthet || pending || (!tetel.kesz && hianyzoMelleklet)}
          title={!tetel.kesz && hianyzoMelleklet ? "Előbb csatolj egy fájlt." : undefined}
          onChange={(e) =>
            futtat(() => setChecklistKeszAction(id, tetel.id, e.target.checked))
          }
          aria-label={`${tetel.cimke} teljesítve`}
        />
        <span
          className={tetel.kesz ? "text-muted-foreground line-through" : "font-medium"}
        >
          {tetel.cimke}
        </span>
        <Badge variant="neutral">{CHECKLIST_KATEGORIA_LABELS[tetel.kategoria]}</Badge>
        {tetel.kotelezo && <Badge variant="warning">Kötelező</Badge>}
        {tetel.mellekletKotelezo && <Badge variant="info">Csatolmány kell</Badge>}
        {szerkeszthet && (
          <button
            type="button"
            aria-label="Tétel törlése"
            className="text-muted-foreground hover:text-destructive ml-auto"
            disabled={pending}
            onClick={() => futtat(() => removeChecklistTetelAction(id, tetel.id))}
          >
            <Trash2Icon className="size-4" />
          </button>
        )}
      </div>
      {(tetel.mellekletMediaIds.length > 0 || szerkeszthet) && (
        <div className="flex flex-wrap items-center gap-2 pl-6">
          {tetel.mellekletMediaIds.map((m, i) => (
            <span key={m} className="inline-flex items-center gap-1 text-xs">
              <PaperclipIcon className="size-3" />
              <a
                href={mediaUrl(m)}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Csatolmány {i + 1}
              </a>
              {szerkeszthet && (
                <button
                  type="button"
                  aria-label="Csatolmány eltávolítása"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={pending}
                  onClick={() => futtat(() => removeMellekletAction(id, tetel.id, m))}
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {szerkeszthet && (
            <FajlFeltolto
              label="Csatolmány"
              onFeltoltve={(m) => {
                futtat(() => addMellekletAction(id, tetel.id, m));
              }}
            />
          )}
        </div>
      )}
    </li>
  );
}

export function ChecklistPanel({
  id,
  checklist,
  sablonok,
  szerkeszthet,
}: {
  id: string;
  checklist: ChecklistSor[];
  sablonok: Array<{ id: string; nev: string; tetelSzam: number }>;
  szerkeszthet: boolean;
}) {
  const { futtat, pending } = useMuvelet();
  const [cimke, setCimke] = useState("");
  const [kategoria, setKategoria] =
    useState<(typeof CHECKLIST_KATEGORIAK)[number]>("egyeb");
  const [kotelezo, setKotelezo] = useState(false);
  const [mellekletKotelezo, setMellekletKotelezo] = useState(false);
  const [sablonId, setSablonId] = useState("");
  const kesz = checklist.filter((t) => t.kesz).length;
  return (
    <div className="flex flex-col gap-3">
      {checklist.length === 0 ? (
        <EmptyNote>Még nincs ellenőrzőlista-tétel.</EmptyNote>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {kesz} / {checklist.length} tétel kész
          </p>
          <ul className="flex flex-col gap-2">
            {checklist.map((t) => (
              <TetelSor key={t.id} id={id} tetel={t} szerkeszthet={szerkeszthet} />
            ))}
          </ul>
        </>
      )}
      {szerkeszthet && (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="cl-cimke">Új tétel</Label>
              <Input
                id="cl-cimke"
                value={cimke}
                onChange={(e) => setCimke(e.target.value)}
                placeholder="Mit kell elvégezni?"
              />
            </div>
            <select
              aria-label="Kategória"
              className={`${SELECT_CLASS} !w-auto`}
              value={kategoria}
              onChange={(e) => setKategoria(e.target.value as typeof kategoria)}
            >
              {CHECKLIST_KATEGORIAK.map((k) => (
                <option key={k} value={k}>
                  {CHECKLIST_KATEGORIA_LABELS[k]}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={kotelezo}
                onChange={(e) => setKotelezo(e.target.checked)}
              />{" "}
              Kötelező
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={mellekletKotelezo}
                onChange={(e) => setMellekletKotelezo(e.target.checked)}
              />{" "}
              Csatolmány kell
            </label>
            <Button
              size="sm"
              disabled={pending || !cimke.trim()}
              onClick={() =>
                futtat(
                  () =>
                    addChecklistTetelAction(id, {
                      cimke,
                      kategoria,
                      kotelezo,
                      mellekletKotelezo,
                    }),
                  () => setCimke(""),
                )
              }
            >
              Hozzáadás
            </Button>
          </div>
          {sablonok.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Sablon"
                className={`${SELECT_CLASS} !w-auto`}
                value={sablonId}
                onChange={(e) => setSablonId(e.target.value)}
              >
                <option value="">Sablon alkalmazása…</option>
                {sablonok.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nev} ({s.tetelSzam} tétel)
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                disabled={pending || !sablonId}
                onClick={() =>
                  futtat(
                    () => sablonAlkalmazAction(id, sablonId),
                    () => setSablonId(""),
                  )
                }
              >
                Alkalmaz
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Staging linkek ──────────────────────────────────────────────────────────────────────────
export function StagingPanel({
  id,
  linkek,
  szerkeszthet,
}: {
  id: string;
  linkek: StagingSor[];
  szerkeszthet: boolean;
}) {
  const { futtat, pending } = useMuvelet();
  const [cimke, setCimke] = useState("");
  const [url, setUrl] = useState("");
  return (
    <div className="flex flex-col gap-3">
      {linkek.length === 0 ? (
        <EmptyNote>Még nincs staging link.</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-2">
          {linkek.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium underline"
              >
                {l.cimke}
                <ExternalLinkIcon className="size-3" />
              </a>
              <Badge variant={STAGING_JOVAHAGYAS_TONES[l.jovahagyas]}>
                {STAGING_JOVAHAGYAS_LABELS[l.jovahagyas]}
              </Badge>
              {l.jovahagyoNev && (
                <span className="text-muted-foreground text-xs">{l.jovahagyoNev}</span>
              )}
              {szerkeszthet && (
                <span className="ml-auto flex items-center gap-1">
                  <select
                    aria-label="Jóváhagyási állapot"
                    className={`${SELECT_CLASS} !h-8 !w-auto`}
                    value={l.jovahagyas}
                    disabled={pending}
                    onChange={(e) =>
                      futtat(() =>
                        setStagingJovahagyasAction(
                          id,
                          l.id,
                          e.target.value as typeof l.jovahagyas,
                        ),
                      )
                    }
                  >
                    {STAGING_JOVAHAGYASOK.map((j) => (
                      <option key={j} value={j}>
                        {STAGING_JOVAHAGYAS_LABELS[j]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="Link törlése"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={pending}
                    onClick={() => futtat(() => removeStagingAction(id, l.id))}
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {szerkeszthet && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="st-cimke">Címke</Label>
            <Input
              id="st-cimke"
              value={cimke}
              onChange={(e) => setCimke(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="st-url">URL</Label>
            <Input
              id="st-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <Button
            size="sm"
            disabled={pending || !cimke.trim() || !url.trim()}
            onClick={() =>
              futtat(
                () => addStagingAction(id, { cimke, url }),
                () => {
                  setCimke("");
                  setUrl("");
                },
              )
            }
          >
            Hozzáadás
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Alaprajzok (csak fájlhivatkozás) ────────────────────────────────────────────────────────
export function AlaprajzPanel({
  projektId,
  partnerId,
  alaprajzok,
  szerkeszthet,
}: {
  projektId: string;
  partnerId?: string;
  alaprajzok: AlaprajzSor[];
  szerkeszthet: boolean;
}) {
  const { futtat, pending } = useMuvelet();
  const [nev, setNev] = useState("");
  return (
    <div className="flex flex-col gap-3">
      {alaprajzok.length === 0 ? (
        <EmptyNote>Még nincs alaprajz.</EmptyNote>
      ) : (
        <ul className="flex flex-col gap-2">
          {alaprajzok.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-1 rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={mediaUrl(a.fajlMediaId)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline"
                >
                  {a.nev}
                </a>
                {a.jelolok.length > 0 && (
                  <Badge variant="neutral">{a.jelolok.length} jelölő</Badge>
                )}
                <span className="ml-auto">
                  <ArchivGombok
                    kompakt
                    alany="alaprajz"
                    archivalt={a.archivalt}
                    ok={a.archivalasOka}
                    onArchive={
                      szerkeszthet
                        ? (ok) => archiveAlaprajzAction(a.id, projektId, ok)
                        : undefined
                    }
                    onRestore={
                      szerkeszthet
                        ? () => restoreAlaprajzAction(a.id, projektId)
                        : undefined
                    }
                  />
                </span>
              </div>
              {a.jelolok.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  {a.jelolok
                    .map((j) => `${j.cimke ?? JELOLO_TIPUS_LABELS[j.tipus]}`)
                    .join(", ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {szerkeszthet && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ap-nev">Új alaprajz neve</Label>
            <Input
              id="ap-nev"
              value={nev}
              onChange={(e) => setNev(e.target.value)}
              placeholder="pl. 1. emelet"
            />
          </div>
          <FajlFeltolto
            label="Fájl kiválasztása és mentés"
            disabled={pending || !nev.trim()}
            onFeltoltve={(m) => {
              futtat(
                () =>
                  createAlaprajzAction({
                    nev,
                    projektId,
                    partnerId,
                    fajlMediaId: m,
                    jelolok: [],
                  }),
                () => setNev(""),
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
