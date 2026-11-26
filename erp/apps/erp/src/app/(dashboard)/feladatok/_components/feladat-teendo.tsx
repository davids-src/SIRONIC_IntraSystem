"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckIcon, UndoIcon } from "lucide-react";
import { Button, Input, Textarea, cn } from "@erp/ui";
import {
  FELADAT_SZOVEG_MAX,
  type FeladatAllapot,
  type FeladatCimzett,
  type FeladatSor,
} from "@erp/feladat/client";
import {
  feladatDontesAction,
  feladatLezarasAction,
  feladatTovabbadasAction,
  feladatUjrakiadasAction,
  feladatVisszavonasAction,
} from "../actions";
import { FelelosValaszto } from "./felelos-valaszto";
import { MegerositoGomb } from "./megerosito-gomb";

type Eredmeny = { success: boolean; message?: string };
type Urlap = "elutasit" | "lezar" | "tovabbad" | "ujrakiad" | null;

const ido = (iso: string) =>
  new Date(iso).toLocaleString("hu-HU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Budapest",
  });

/** The road of a task; a refused / withdrawn / handed-on task ends where it left it. */
const UT: Array<{ allapot: FeladatAllapot; cimke: string }> = [
  { allapot: "kiadva", cimke: "Kiadva" },
  { allapot: "elfogadva", cimke: "Elfogadva" },
  { allapot: "lezarva", cimke: "Kész" },
];
const KITERO: Partial<Record<FeladatAllapot, string>> = {
  elutasitva: "Elutasítva",
  visszavonva: "Visszavonva",
  tovabbadva: "Továbbadva",
};

/** The log entry that put the task into its current state (later lines only note changes). */
function allapotBelepes(f: FeladatSor) {
  const n = f.naplo;
  let i = n.length - 1;
  while (i > 0 && n[i - 1]!.allapot === f.allapot) i--;
  return n[i];
}

/** One sentence: where the task stands and what this viewer is expected to do. */
function helyzet(f: FeladatSor): { cim: string; leiras?: string } {
  const m = f.muveletek;
  const be = allapotBelepes(f);
  const ok = be?.megjegyzes ? `„${be.megjegyzes}”` : undefined;
  switch (f.allapot) {
    case "kiadva":
      if (m.dont)
        return {
          cim: "Elfogadásra vár",
          leiras: `${f.kiadoNev} neked adta ezt a feladatot. Fogadd el, ha vállalod — ha nem, utasítsd el, és írd meg, miért.`,
        };
      return {
        cim: `Elfogadásra vár: ${f.felelosNev}`,
        leiras: "Amint elfogadja vagy elutasítja, értesítést kapsz.",
      };
    case "elfogadva":
      if (f.sajat) return { cim: "Folyamatban", leiras: "Ha elkészült, jelöld késznek." };
      if (m.lezar)
        return {
          cim: "Folyamatban — rajtad a sor",
          leiras: `Ha elkészült, jelöld késznek; ${f.kiadoNev} értesítést kap.`,
        };
      return { cim: `Folyamatban: ${f.felelosNev} dolgozik rajta` };
    case "elutasitva":
      return {
        cim: `${f.felelosNev} elutasította`,
        leiras: [ok && `Indok: ${ok}.`, m.ujrakiad && "Add ki másnak, vagy vond vissza."]
          .filter(Boolean)
          .join(" "),
      };
    case "lezarva":
      return {
        cim: "Kész",
        leiras: [
          be && `${be.kiNev ?? ""} lezárta, ${ido(be.mikor)}.`,
          ok && `Megjegyzés: ${ok}`,
        ]
          .filter(Boolean)
          .join(" "),
      };
    case "visszavonva":
      return {
        cim: f.sajat ? "Elvetve" : "Visszavonva",
        leiras: [be && ido(be.mikor), ok && `Indok: ${ok}`].filter(Boolean).join(" · "),
      };
    case "tovabbadva":
      return {
        cim: "Továbbadva",
        leiras: [
          ok && `Indok: ${ok}.`,
          "Az új felelős példánya az átadási láncban nyitható meg.",
        ]
          .filter(Boolean)
          .join(" "),
      };
  }
}

/**
 * "Mi a teendő?" — the task's state as a road (kiadva → elfogadva → kész), one sentence on
 * where it stands, and the buttons of the next step. Each action that needs words (refusal,
 * closing note, hand-on reason) opens its own small form, so nothing is typed into the chat by
 * mistake.
 */
export function FeladatTeendo({
  feladat: f,
  cimzettek,
  ma,
  peldany,
}: {
  feladat: FeladatSor;
  cimzettek: FeladatCimzett[];
  ma: string;
  /** Group task seen by the kiadó: whose copy this panel acts on. */
  peldany?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [urlap, setUrlap] = useState<Urlap>(null);
  const [szoveg, setSzoveg] = useState("");
  const m = f.muveletek;
  const h = helyzet(f);

  const run = (fn: () => Promise<Eredmeny>) =>
    startTransition(async () => {
      const r = await fn();
      if (r.success) {
        toast.success(r.message);
        setUrlap(null);
        setSzoveg("");
        router.refresh();
      } else toast.error(r.message ?? "Nem sikerült.");
    });
  const nyit = (u: Urlap) => {
    setSzoveg("");
    setUrlap(urlap === u ? null : u);
  };

  const kitero = KITERO[f.allapot];
  const lepesIndex = UT.findIndex((u) => u.allapot === f.allapot);
  // A refused task stopped after "Kiadva"; withdrawn / handed on after the last state reached.
  const elert = kitero
    ? f.naplo.some((n) => n.allapot === "elfogadva")
      ? 1
      : 0
    : lepesIndex;
  const vanGomb = m.dont || m.lezar || m.tovabbad || m.ujrakiad || m.visszavon;

  return (
    <section
      className="bg-card flex flex-col gap-4 rounded-lg border p-4"
      aria-labelledby="mi-a-teendo"
    >
      <h2 id="mi-a-teendo" className="text-muted-foreground -mb-2 text-xs font-medium">
        Mi a teendő?
      </h2>
      {peldany && (
        <p className="text-muted-foreground -mb-2 text-xs">
          {peldany} példánya — másik résztvevőt a Résztvevők között választhatsz.
        </p>
      )}
      <ol
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
        aria-label="Állapot"
      >
        {UT.slice(0, kitero ? elert + 1 : UT.length).map((u, i) => {
          const kesz = i < elert || (i === elert && f.allapot === "lezarva");
          const aktiv = i === elert && !kitero && f.allapot !== "lezarva";
          return (
            <li key={u.allapot} className="flex items-center gap-2">
              {i > 0 && <span className="bg-border h-px w-6" aria-hidden />}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 font-medium",
                  aktiv
                    ? "text-foreground"
                    : kesz
                      ? "text-foreground/80"
                      : "text-muted-foreground",
                )}
                aria-current={aktiv ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border text-[10px]",
                    kesz && "border-success bg-success text-success-foreground",
                    aktiv && "border-primary bg-primary text-primary-foreground",
                  )}
                  aria-hidden
                >
                  {kesz ? <CheckIcon className="size-3" /> : i + 1}
                </span>
                {u.cimke}
              </span>
            </li>
          );
        })}
        {kitero && (
          <li className="flex items-center gap-2">
            <span className="bg-border h-px w-6" aria-hidden />
            <span className="text-danger font-medium">{kitero}</span>
          </li>
        )}
      </ol>

      <div>
        <p className="font-semibold">{h.cim}</p>
        {h.leiras && <p className="text-muted-foreground mt-0.5 text-sm">{h.leiras}</p>}
      </div>

      {vanGomb && (
        <div className="flex flex-wrap gap-2">
          {m.dont && (
            <>
              <Button
                disabled={pending}
                onClick={() => run(() => feladatDontesAction(f.id, { elfogad: true }))}
              >
                Elfogadom
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => nyit("elutasit")}
              >
                Elutasítom…
              </Button>
            </>
          )}
          {m.lezar && (
            <Button disabled={pending} onClick={() => nyit("lezar")}>
              Késznek jelölöm…
            </Button>
          )}
          {m.ujrakiad && (
            <Button disabled={pending} onClick={() => nyit("ujrakiad")}>
              Kiadom másnak…
            </Button>
          )}
          {m.tovabbad && (
            <Button variant="outline" disabled={pending} onClick={() => nyit("tovabbad")}>
              Továbbadom…
            </Button>
          )}
          {m.visszavon && (
            <MegerositoGomb
              cimke={f.sajat ? "Elvetem" : "Visszavonom"}
              ikon={<UndoIcon className="size-3.5" aria-hidden />}
              variant="ghost"
              cim={f.sajat ? "Elveted a saját feladatot?" : "Visszavonod a feladatot?"}
              leiras={
                f.sajat
                  ? `„${f.cim}” lekerül a listádról (a Lezártak között megmarad).`
                  : `„${f.cim}” lekerül ${f.felelosNev} listájáról.`
              }
              megerosites={f.sajat ? "Elvetem" : "Visszavonom"}
              okMezo={!f.sajat}
              onConfirm={(indok) => feladatVisszavonasAction(f.id, indok)}
            />
          )}
        </div>
      )}

      {urlap === "elutasit" && (
        <Urlap
          cim="Miért utasítod el?"
          leiras={`${f.kiadoNev} látja az indokot, és kiadhatja másnak.`}
          onMegse={() => setUrlap(null)}
        >
          <Textarea
            value={szoveg}
            onChange={(e) => setSzoveg(e.target.value)}
            rows={3}
            maxLength={FELADAT_SZOVEG_MAX}
            aria-label="Elutasítás oka"
            autoFocus
          />
          <Button
            variant="destructive"
            disabled={pending || !szoveg.trim()}
            onClick={() =>
              run(() => feladatDontesAction(f.id, { elfogad: false, indok: szoveg }))
            }
          >
            Elutasítom
          </Button>
        </Urlap>
      )}

      {urlap === "lezar" && (
        <Urlap
          cim="Késznek jelölöd"
          leiras="Írhatsz pár szót arról, mi készült el — nem kötelező."
          onMegse={() => setUrlap(null)}
        >
          <Textarea
            value={szoveg}
            onChange={(e) => setSzoveg(e.target.value)}
            rows={3}
            maxLength={FELADAT_SZOVEG_MAX}
            aria-label="Megjegyzés a lezáráshoz"
            autoFocus
          />
          <Button
            disabled={pending}
            onClick={() =>
              run(() => feladatLezarasAction(f.id, szoveg.trim() || undefined))
            }
          >
            Kész
          </Button>
        </Urlap>
      )}

      {urlap === "tovabbad" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const vissza = (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
              "value",
            );
            run(() =>
              feladatTovabbadasAction(f.id, {
                celId: vissza === "kiado" ? f.kiadoId : (fd.get("celId") ?? ""),
                indok: szoveg,
              }),
            );
          }}
        >
          <Urlap
            cim="Továbbadás"
            leiras={`Nálad „Továbbadva” lesz; az új felelősnél újra elfogadásra vár. ${f.kiadoNev} értesítést kap.`}
            onMegse={() => setUrlap(null)}
          >
            <label className="flex flex-col gap-1 text-sm">
              Kinek?
              <FelelosValaszto name="celId" emberek={cimzettek} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Miért adod tovább?
              <Textarea
                value={szoveg}
                onChange={(e) => setSzoveg(e.target.value)}
                rows={2}
                maxLength={FELADAT_SZOVEG_MAX}
                required
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" value="mas" disabled={pending || !szoveg.trim()}>
                Továbbadom
              </Button>
              <Button
                type="submit"
                variant="outline"
                value="kiado"
                disabled={pending || !szoveg.trim()}
              >
                Visszaadom a kiadónak
              </Button>
            </div>
          </Urlap>
        </form>
      )}

      {urlap === "ujrakiad" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() =>
              feladatUjrakiadasAction(f.id, {
                felelosId: fd.get("felelosId") ?? "",
                hatarido: fd.get("hatarido") ?? "",
              }),
            );
          }}
        >
          <Urlap
            cim="Kiadás másnak"
            leiras="Az új felelősnél elfogadásra vár, az új határidővel."
            onMegse={() => setUrlap(null)}
          >
            <label className="flex flex-col gap-1 text-sm">
              Kinek?
              <FelelosValaszto name="felelosId" emberek={cimzettek} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Új határidő
              <Input name="hatarido" type="date" min={ma} defaultValue={ma} required />
            </label>
            <Button type="submit" disabled={pending}>
              Kiadom
            </Button>
          </Urlap>
        </form>
      )}
    </section>
  );
}

function Urlap({
  cim,
  leiras,
  onMegse,
  children,
}: {
  cim: string;
  leiras?: string;
  onMegse: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{cim}</p>
          {leiras && <p className="text-muted-foreground text-xs">{leiras}</p>}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onMegse}>
          Mégse
        </Button>
      </div>
      {children}
    </div>
  );
}
