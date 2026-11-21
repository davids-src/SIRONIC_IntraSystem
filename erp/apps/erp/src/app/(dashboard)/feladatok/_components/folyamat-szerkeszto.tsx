"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookmarkPlusIcon,
  LockIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { Button, Checkbox, Combobox, Input, Label, cn } from "@erp/ui";
import { FOLYAMAT_LEPES_MAX, type FolyamatSablonSor } from "@erp/feladat/client";
import { folyamatSablonMentesAction } from "../folyamat/actions";

/** One editable step row. `kulcs` is local (React key); `id` an existing planned step. */
export type FolyamatSzerkesztoSor = {
  kulcs: string;
  id?: string;
  nev: string;
  felelosId: string;
  hatarido?: string;
};

export type FolyamatEmber = { id: string; nev: string };

let sorszam = 0;
export const ujSor = (
  minta: Partial<FolyamatSzerkesztoSor> = {},
): FolyamatSzerkesztoSor => ({
  kulcs: `s${++sorszam}`,
  nev: "",
  felelosId: "",
  ...minta,
});

const napPlusz = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Colleague picker: type a name, pick it; the row stores the id. */
function EmberMezo({
  emberek,
  value,
  onChange,
  id,
}: {
  emberek: FolyamatEmber[];
  value: string;
  onChange: (id: string) => void;
  id?: string;
}) {
  const nev = emberek.find((e) => e.id === value)?.nev ?? "";
  const [szoveg, setSzoveg] = useState(nev);
  const options = useMemo(
    () => emberek.map((e) => ({ value: e.id, label: e.nev })),
    [emberek],
  );
  const megtalalt = (t: string) =>
    emberek.find(
      (e) => e.nev.toLocaleLowerCase("hu") === t.trim().toLocaleLowerCase("hu"),
    );
  return (
    <Combobox
      id={id}
      value={szoveg || nev}
      onChange={(t) => {
        setSzoveg(t);
        onChange(megtalalt(t)?.id ?? "");
      }}
      options={options}
      placeholder="Felelős neve…"
      emptyMessage="Nincs ilyen kolléga"
    />
  );
}

/**
 * "Folyamat (lépések)" editor (#67): ordered steps, each with a name, one felelős and an optional
 * deadline — add, remove, reorder, load a saved flow, save the steps as a flow template.
 * `zarolt` rows (already started) show read-only in front. Controlled: the parent owns `sorok`.
 */
export function FolyamatSzerkeszto({
  sorok,
  onChange,
  emberek,
  sablonok = [],
  zarolt = [],
  kezdoNap,
  onSablonokValtozott,
}: {
  sorok: FolyamatSzerkesztoSor[];
  onChange: (sorok: FolyamatSzerkesztoSor[]) => void;
  emberek: FolyamatEmber[];
  sablonok?: FolyamatSablonSor[];
  /** Started steps, shown read-only above the editable ones. */
  zarolt?: Array<{ nev: string; felelosNev?: string; allapotCimke: string }>;
  /** Template day offsets count from this day (`YYYY-MM-DD`). */
  kezdoNap?: string;
  onSablonokValtozott?: () => void;
}) {
  const azon = useId();
  const [pending, startTransition] = useTransition();
  const [sablonNev, setSablonNev] = useState("");
  const [megosztott, setMegosztott] = useState(false);
  const [mentesNyitva, setMentesNyitva] = useState(false);

  const modosit = (kulcs: string, minta: Partial<FolyamatSzerkesztoSor>) =>
    onChange(sorok.map((s) => (s.kulcs === kulcs ? { ...s, ...minta } : s)));
  const mozgat = (i: number, irany: -1 | 1) => {
    const j = i + irany;
    if (j < 0 || j >= sorok.length) return;
    const uj = [...sorok];
    [uj[i], uj[j]] = [uj[j]!, uj[i]!];
    onChange(uj);
  };
  const osszes = zarolt.length + sorok.length;

  const betolt = (sablonId: string) => {
    const s = sablonok.find((x) => x.id === sablonId);
    if (!s) return;
    const ismert = new Set(emberek.map((e) => e.id));
    onChange(
      s.lepesek.map((l) =>
        ujSor({
          nev: l.nev,
          felelosId: l.felelosId && ismert.has(l.felelosId) ? l.felelosId : "",
          hatarido:
            kezdoNap && l.napok !== undefined ? napPlusz(kezdoNap, l.napok) : undefined,
        }),
      ),
    );
  };

  const ment = () =>
    startTransition(async () => {
      const r = await folyamatSablonMentesAction({
        nev: sablonNev,
        megosztott,
        lepesek: sorok.map((s) => ({
          nev: s.nev,
          felelosId: s.felelosId || undefined,
          napok:
            kezdoNap && s.hatarido
              ? Math.max(
                  0,
                  Math.round(
                    (Date.parse(s.hatarido) - Date.parse(kezdoNap)) / 86_400_000,
                  ),
                )
              : undefined,
        })),
      });
      if (r.success) {
        toast.success(r.message);
        setMentesNyitva(false);
        setSablonNev("");
        onSablonokValtozott?.();
      } else toast.error(r.message ?? "Nem sikerült menteni");
    });

  return (
    <div className="flex flex-col gap-3">
      {sablonok.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={`${azon}-sablon`} className="text-muted-foreground text-xs">
            Mentett folyamat betöltése
          </Label>
          <select
            id={`${azon}-sablon`}
            className="border-input bg-background h-8 rounded-md border px-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              betolt(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">Válassz…</option>
            {sablonok.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nev}
                {s.megosztott && !s.sajat ? " (közös)" : ""} · {s.lepesek.length} lépés
              </option>
            ))}
          </select>
        </div>
      )}

      <ol className="flex flex-col gap-2" aria-label="Lépések">
        {zarolt.map((z, i) => (
          <li
            key={`z${i}`}
            className="bg-muted/40 text-muted-foreground flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <span className="w-5 text-center text-xs tabular-nums">{i + 1}.</span>
            <LockIcon className="size-3.5 shrink-0" aria-hidden />
            <span className="text-foreground min-w-0 flex-1 truncate">{z.nev}</span>
            <span className="truncate text-xs">
              {z.felelosNev} · {z.allapotCimke}
            </span>
          </li>
        ))}
        {sorok.map((s, i) => {
          const n = zarolt.length + i + 1;
          return (
            <li key={s.kulcs} className="flex flex-col gap-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-5 text-center text-xs font-semibold tabular-nums">
                  {n}.
                </span>
                <Input
                  value={s.nev}
                  onChange={(e) => modosit(s.kulcs, { nev: e.target.value })}
                  placeholder={n === 1 ? "pl. Árajánlatok bekérése" : "pl. Jóváhagyás"}
                  aria-label={`${n}. lépés neve`}
                  maxLength={200}
                  className="min-w-0 flex-1"
                />
                <div className="flex shrink-0 items-center">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={i === 0}
                    onClick={() => mozgat(i, -1)}
                    aria-label="Feljebb"
                  >
                    <ArrowUpIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    disabled={i === sorok.length - 1}
                    onClick={() => mozgat(i, 1)}
                    aria-label="Lejjebb"
                  >
                    <ArrowDownIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => onChange(sorok.filter((x) => x.kulcs !== s.kulcs))}
                    aria-label={`${n}. lépés törlése`}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 pl-7 sm:grid-cols-[1fr_10rem]">
                <EmberMezo
                  emberek={emberek}
                  value={s.felelosId}
                  onChange={(felelosId) => modosit(s.kulcs, { felelosId })}
                  id={`${azon}-${s.kulcs}-f`}
                />
                <Input
                  type="date"
                  value={s.hatarido ?? ""}
                  onChange={(e) =>
                    modosit(s.kulcs, { hatarido: e.target.value || undefined })
                  }
                  aria-label={`${n}. lépés határideje`}
                  title="Üresen: a folyamat határideje"
                />
              </div>
              {!s.felelosId && (s.nev || i > 0) && (
                <p className="text-muted-foreground pl-7 text-xs">
                  Válassz felelőst a listából.
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={osszes >= FOLYAMAT_LEPES_MAX}
          onClick={() => onChange([...sorok, ujSor()])}
        >
          <PlusIcon className="size-4" aria-hidden /> Lépés hozzáadása
        </Button>
        {sorok.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMentesNyitva((v) => !v)}
            aria-expanded={mentesNyitva}
          >
            <BookmarkPlusIcon className="size-4" aria-hidden /> Mentés sablonként
          </Button>
        )}
      </div>
      {mentesNyitva && (
        <div className={cn("flex flex-wrap items-end gap-2 rounded-md border p-3")}>
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <Label htmlFor={`${azon}-snev`}>Sablon neve</Label>
            <Input
              id={`${azon}-snev`}
              value={sablonNev}
              onChange={(e) => setSablonNev(e.target.value)}
              maxLength={100}
              placeholder="pl. Beszerzés jóváhagyással"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={megosztott}
              onCheckedChange={(v) => setMegosztott(v === true)}
            />
            Mindenki használhatja
          </label>
          <Button
            type="button"
            size="sm"
            disabled={pending || !sablonNev.trim()}
            onClick={ment}
          >
            Mentés
          </Button>
        </div>
      )}
    </div>
  );
}

/** Rows → the actions' step input (empty rows dropped). */
export function szerkesztoLepesek(sorok: FolyamatSzerkesztoSor[]) {
  return sorok
    .filter((s) => s.nev.trim() || s.felelosId)
    .map((s) => ({ id: s.id, nev: s.nev, felelosId: s.felelosId, hatarido: s.hatarido }));
}
