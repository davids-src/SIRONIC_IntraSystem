"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, WorkflowIcon } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  cn,
} from "@erp/ui";
import {
  FELADAT_CIM_MAX,
  FELADAT_SZOVEG_MAX,
  type FeladatPrioritas,
} from "@erp/feladat/client";
import type { FeladatCimzett } from "@erp/feladat";
import { ujFeladatAction } from "../actions";
import { CimzettValaszto } from "./cimzett-valaszto";
import { CsatolmanyFeltolto, type Csatolmany } from "./csatolmany";
import { PrioritasValaszto } from "./prioritas-valaszto";
import { KategoriaMezo } from "./kategoria-mezo";

/** `YYYY-MM-DD` + n days (calendar arithmetic, no time zone drift). */
export const napPlusz = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const HATARIDO_GYORS: Array<{ cimke: string; nap: number }> = [
  { cimke: "Ma", nap: 0 },
  { cimke: "Holnap", nap: 1 },
  { cimke: "1 hét", nap: 7 },
  { cimke: "2 hét", nap: 14 },
];

type Hibak = Partial<Record<"cim" | "kategoria" | "kinek" | "hatarido", string>>;

/** A numbered form section: a small heading, an optional hint, the fields. */
function Szakasz({
  szam,
  cim,
  sugo,
  children,
}: {
  szam: number;
  cim: string;
  sugo?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2 border-t pt-4 first:border-t-0 first:pt-0">
      <legend className="contents">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span className="bg-muted text-muted-foreground flex size-5 items-center justify-center rounded-full text-[11px]">
            {szam}
          </span>
          {cim}
        </span>
      </legend>
      {sugo && <p className="text-muted-foreground -mt-1 text-xs">{sugo}</p>}
      {children}
    </fieldset>
  );
}

function Hiba({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} className="text-danger text-xs" role="alert">
      {children}
    </p>
  );
}

/**
 * "Új feladat" (#68) — a dialog in plain steps: what, which kategória (required), to whom (one
 * person, several or a whole role), by when (presets) and how urgent, attachments. A task in
 * several steps with different felelősök is a folyamat — linked from here (#67).
 */
export function UjFeladatForm({
  cimzettek,
  ma,
  sajatId,
  kategoriak,
}: {
  cimzettek: FeladatCimzett[];
  /** Categories used so far, most used first (#65). */
  kategoriak: string[];
  /** Today (Budapest), `YYYY-MM-DD` — the earliest deadline. */
  ma: string;
  sajatId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [nyitva, setNyitva] = useState(false);
  const [cim, setCim] = useState("");
  const [leiras, setLeiras] = useState("");
  const [kinek, setKinek] = useState<string[]>([]);
  const [hatarido, setHatarido] = useState(ma);
  const [prioritas, setPrioritas] = useState<FeladatPrioritas>("normal");
  const [valasztottElsodleges, setElsodleges] = useState<string>();
  const [csatolmanyok, setCsatolmanyok] = useState<Csatolmany[]>([]);
  const [kategoria, setKategoria] = useState("");
  const [probalt, setProbalt] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  // A group task always has a primary felelős: the starred one, or the first picked.
  const elsodleges =
    kinek.length > 1
      ? valasztottElsodleges && kinek.includes(valasztottElsodleges)
        ? valasztottElsodleges
        : kinek[0]
      : undefined;

  const hibak: Hibak = {
    cim: cim.trim() ? undefined : "Írd le röviden, mit kell megcsinálni.",
    kategoria: kategoria.trim()
      ? undefined
      : "Válassz kategóriát a korábbiakból, vagy írj be egy újat.",
    kinek: kinek.length ? undefined : "Válaszd ki, kinek adod — vagy „Magamnak”.",
    hatarido: hatarido && hatarido >= ma ? undefined : "A határidő nem lehet a múltban.",
  };
  const latszik = (k: keyof Hibak) => (probalt ? hibak[k] : undefined);

  const masnak = kinek.filter((id) => id !== sajatId).length;
  const gomb =
    kinek.length === 1 && kinek[0] === sajatId
      ? "Felveszem magamnak"
      : kinek.length > 1
        ? `Kiadom ${kinek.length} embernek`
        : "Kiadom";

  const alaphelyzet = () => {
    setCim("");
    setLeiras("");
    setKinek([]);
    setHatarido(ma);
    setPrioritas("normal");
    setElsodleges(undefined);
    setCsatolmanyok([]);
    setKategoria("");
    setProbalt(false);
  };

  const kuld = () => {
    setProbalt(true);
    const elso = (Object.keys(hibak) as Array<keyof Hibak>).find((k) => hibak[k]);
    if (elso) {
      // Focus the first field that needs attention (the kategória combobox renders an input).
      formRef.current
        ?.querySelector<HTMLElement>(
          `[data-mezo="${elso}"] input, [data-mezo="${elso}"] textarea`,
        )
        ?.focus();
      return;
    }
    startTransition(async () => {
      const r = await ujFeladatAction({
        felelosIds: kinek,
        cim,
        leiras: leiras.trim() || undefined,
        hatarido,
        prioritas,
        elsodlegesId: elsodleges,
        mediaIds: csatolmanyok.map((c) => c.id),
        kategoria: kategoria.trim(),
      });
      if (r.success) {
        toast.success(r.message);
        alaphelyzet();
        setNyitva(false);
        router.refresh();
      } else toast.error(r.message ?? "Nem sikerült.");
    });
  };

  return (
    <>
      <Button size="sm" onClick={() => setNyitva(true)}>
        <PlusIcon className="h-4 w-4" aria-hidden />
        Új feladat
      </Button>
      <Dialog open={nyitva} onOpenChange={setNyitva}>
        <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Új feladat</DialogTitle>
            <DialogDescription>
              Magadnak, egy kollégának vagy egyszerre többeknek. A feladat, a kategória, a
              címzett és a határidő kötelező.
            </DialogDescription>
          </DialogHeader>
          <form
            ref={formRef}
            noValidate
            className="flex flex-col gap-4"
            // Ctrl / Cmd + Enter sends from anywhere in the form (also from the description).
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                kuld();
              }
            }}
            onSubmit={(e) => {
              e.preventDefault();
              kuld();
            }}
          >
            <Szakasz szam={1} cim="Mi a feladat?">
              <div className="flex flex-col gap-1.5" data-mezo="cim">
                <Label htmlFor="uj-feladat-cim">
                  Feladat <span className="text-danger">*</span>
                </Label>
                <Input
                  id="uj-feladat-cim"
                  value={cim}
                  onChange={(e) => setCim(e.target.value)}
                  autoFocus
                  maxLength={FELADAT_CIM_MAX}
                  placeholder="Röviden, mit kell megcsinálni — pl. „Ajánlat bekérése a gumiszerelőtől”"
                  aria-invalid={Boolean(latszik("cim"))}
                  aria-describedby={latszik("cim") ? "uj-feladat-cim-hiba" : undefined}
                />
                <Hiba id="uj-feladat-cim-hiba">{latszik("cim")}</Hiba>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="uj-feladat-leiras">Részletek</Label>
                <Textarea
                  id="uj-feladat-leiras"
                  value={leiras}
                  onChange={(e) => setLeiras(e.target.value)}
                  rows={3}
                  maxLength={FELADAT_SZOVEG_MAX}
                  placeholder="Mire figyeljen, hol találja, mi a cél — nem kötelező"
                />
              </div>
              <CsatolmanyFeltolto
                value={csatolmanyok}
                onChange={setCsatolmanyok}
                disabled={pending}
              />
            </Szakasz>

            <Szakasz
              szam={2}
              cim="Kategória"
              sugo="Ez alapján csoportosít a lista és a kimutatás. Válassz a korábbiakból, vagy írj újat."
            >
              <div className="flex flex-col gap-1.5" data-mezo="kategoria">
                <Label htmlFor="uj-feladat-kategoria" className="sr-only">
                  Kategória
                </Label>
                <KategoriaMezo
                  id="uj-feladat-kategoria"
                  value={kategoria}
                  onChange={setKategoria}
                  kategoriak={kategoriak}
                  invalid={Boolean(latszik("kategoria"))}
                />
                {kategoriak.length > 0 && !kategoria.trim() && (
                  <div className="flex flex-wrap gap-1.5" aria-label="Gyakori kategóriák">
                    {kategoriak.slice(0, 5).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setKategoria(k)}
                        className="bg-muted hover:bg-accent rounded-full px-2.5 py-0.5 text-xs"
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                )}
                <Hiba id="uj-feladat-kategoria-hiba">{latszik("kategoria")}</Hiba>
              </div>
            </Szakasz>

            <Szakasz
              szam={3}
              cim="Kinek?"
              sugo={
                kinek.length > 1 ? (
                  <>
                    Csoportos feladat, {kinek.length} fő — mindenki saját példányt kap, a
                    beszélgetés közös. A csillaggal jelölt az{" "}
                    <strong>elsődleges felelős</strong>.
                  </>
                ) : (
                  "Egy kolléga, több ember, egy egész szerepkör, vagy magadnak."
                )
              }
            >
              <div className="flex flex-col gap-1.5" data-mezo="kinek">
                <CimzettValaszto
                  emberek={cimzettek}
                  sajatId={sajatId}
                  value={kinek}
                  onChange={setKinek}
                  elsodlegesId={elsodleges}
                  onElsodleges={setElsodleges}
                />
                <Hiba id="uj-feladat-kinek-hiba">{latszik("kinek")}</Hiba>
              </div>
            </Szakasz>

            <Szakasz szam={4} cim="Határidő és prioritás">
              <div className="flex flex-col gap-1.5" data-mezo="hatarido">
                <Label htmlFor="uj-feladat-hatarido" className="sr-only">
                  Határidő
                </Label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {HATARIDO_GYORS.map((g) => {
                    const nap = napPlusz(ma, g.nap);
                    return (
                      <button
                        key={g.cimke}
                        type="button"
                        aria-pressed={hatarido === nap}
                        onClick={() => setHatarido(nap)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          hatarido === nap
                            ? "border-primary bg-primary text-primary-foreground"
                            : "hover:bg-muted",
                        )}
                      >
                        {g.cimke}
                      </button>
                    );
                  })}
                  <Input
                    id="uj-feladat-hatarido"
                    type="date"
                    min={ma}
                    value={hatarido}
                    onChange={(e) => setHatarido(e.target.value)}
                    className="w-40"
                    aria-invalid={Boolean(latszik("hatarido"))}
                  />
                </div>
                <Hiba id="uj-feladat-hatarido-hiba">{latszik("hatarido")}</Hiba>
              </div>
              <PrioritasValaszto value={prioritas} onChange={setPrioritas} />
            </Szakasz>

            <Szakasz szam={5} cim="Több lépésben, több felelőssel?">
              <Link
                href="/feladatok/folyamat/uj"
                className="hover:bg-muted flex items-start gap-2 rounded-md border border-dashed px-3 py-2 text-sm"
              >
                <WorkflowIcon
                  className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  aria-hidden
                />
                <span>
                  <span className="font-medium">Indíts folyamatot</span>
                  <span className="text-muted-foreground block text-xs">
                    Egymás után következő lépések, mindegyiknek saját felelőssel és
                    határidővel — a következő lépés felelőse akkor kap feladatot, amikor
                    az előző kész.
                  </span>
                </span>
              </Link>
            </Szakasz>

            <p className="text-muted-foreground text-xs">
              {masnak > 0
                ? "A kollégák értesítést kapnak, és a Teendőim között fogadják el vagy utasítják el. Ha valaki elutasítja, az ő példánya visszakerül hozzád."
                : "A saját feladat rögtön a Teendőid közé kerül, elfogadás nélkül."}
            </p>
            <div className="bg-background sticky bottom-0 -mb-2 flex flex-wrap items-center gap-2 border-t py-3">
              <Button type="submit" size="sm" disabled={pending}>
                {gomb}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setNyitva(false)}
              >
                Mégse
              </Button>
              <span className="text-muted-foreground ml-auto hidden text-xs sm:inline">
                Ctrl + Enter: kiadás
              </span>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
