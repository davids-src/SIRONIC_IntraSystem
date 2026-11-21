"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Label, Textarea } from "@erp/ui";
import {
  FELADAT_SZOVEG_MAX,
  folyamatUrl,
  type FeladatPrioritas,
  type FolyamatSablonSor,
} from "@erp/feladat/client";
import { KategoriaMezo } from "../../_components/kategoria-mezo";
import { PrioritasValaszto } from "../../_components/prioritas-valaszto";
import {
  FolyamatSzerkeszto,
  szerkesztoLepesek,
  ujSor,
  type FolyamatEmber,
  type FolyamatSzerkesztoSor,
} from "../../_components/folyamat-szerkeszto";
import { folyamatSablonokAction, ujFolyamatAction } from "../actions";

export type UjFolyamatAlap = {
  cim?: string;
  leiras?: string;
  hatarido?: string;
  prioritas?: FeladatPrioritas;
  kategoria?: string;
  /** An existing task becomes step 1 (its felelős is fixed). */
  feladatId?: string;
  elsoLepes?: { nev: string; felelosId: string };
};

/**
 * New Feladat-folyamat (#67): what has to be done, the overall deadline, then the steps in
 * order — each with its own felelős. Step 1 starts at once; each next one when the previous
 * felelős marks theirs done.
 */
export function UjFolyamatForm({
  emberek,
  kategoriak,
  sablonok: kezdoSablonok,
  ma,
  alap = {},
}: {
  emberek: FolyamatEmber[];
  kategoriak: string[];
  sablonok: FolyamatSablonSor[];
  ma: string;
  alap?: UjFolyamatAlap;
}) {
  const azon = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cim, setCim] = useState(alap.cim ?? "");
  const [leiras, setLeiras] = useState(alap.leiras ?? "");
  const [hatarido, setHatarido] = useState(alap.hatarido ?? "");
  const [prioritas, setPrioritas] = useState<FeladatPrioritas>(
    alap.prioritas ?? "normal",
  );
  const [kategoria, setKategoria] = useState(alap.kategoria ?? "");
  const [sablonok, setSablonok] = useState(kezdoSablonok);
  const [sorok, setSorok] = useState<FolyamatSzerkesztoSor[]>(() =>
    alap.elsoLepes ? [ujSor()] : [ujSor(), ujSor()],
  );
  const elso = alap.elsoLepes;

  const kuld = () =>
    startTransition(async () => {
      const tovabbi = szerkesztoLepesek(sorok);
      const r = await ujFolyamatAction({
        cim,
        leiras: leiras || undefined,
        hatarido,
        prioritas,
        kategoria: kategoria || undefined,
        feladatId: alap.feladatId,
        lepesek: elso
          ? [{ nev: elso.nev, felelosId: elso.felelosId }, ...tovabbi]
          : tovabbi,
      });
      if (r.success && r.id) {
        toast.success(r.message);
        router.push(folyamatUrl(r.id));
      } else toast.error(r.message ?? "Nem sikerült elindítani");
    });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        kuld();
      }}
    >
      <section className="bg-card flex flex-col gap-4 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">1. Mi a feladat?</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${azon}-cim`}>Megnevezés</Label>
          <Input
            id={`${azon}-cim`}
            value={cim}
            onChange={(e) => setCim(e.target.value)}
            maxLength={200}
            required
            placeholder="pl. Új gép beszerzése"
            disabled={Boolean(alap.feladatId)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${azon}-leiras`}>
            Leírás (mindegyik lépés felelőse látja)
          </Label>
          <Textarea
            id={`${azon}-leiras`}
            value={leiras}
            onChange={(e) => setLeiras(e.target.value)}
            maxLength={FELADAT_SZOVEG_MAX}
            rows={3}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${azon}-hatarido`}>A folyamat határideje</Label>
            <Input
              id={`${azon}-hatarido`}
              type="date"
              value={hatarido}
              min={ma}
              onChange={(e) => setHatarido(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${azon}-kat`}>Kategória</Label>
            <KategoriaMezo
              id={`${azon}-kat`}
              value={kategoria}
              onChange={setKategoria}
              kategoriak={kategoriak}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Prioritás</span>
          <PrioritasValaszto value={prioritas} onChange={setPrioritas} />
        </div>
      </section>

      <section className="bg-card flex flex-col gap-4 rounded-lg border p-4">
        <div>
          <h2 className="text-sm font-semibold">
            2. Lépések — ki, mit, milyen sorrendben
          </h2>
          <p className="text-muted-foreground text-xs">
            Az 1. lépés felelőse azonnal megkapja a feladatot. Ha késznek jelöli, a
            következő lépés felelőse kapja meg — így mindenki látja, kinél tart és mi a
            része benne.
          </p>
        </div>
        {elso && (
          <p className="bg-muted/40 rounded-md border px-3 py-2 text-sm">
            <span className="text-muted-foreground">1. lépés (a meglévő feladat): </span>
            {elso.nev} — {emberek.find((e) => e.id === elso.felelosId)?.nev ?? "felelős"}
          </p>
        )}
        <FolyamatSzerkeszto
          sorok={sorok}
          onChange={setSorok}
          emberek={emberek}
          sablonok={sablonok}
          kezdoNap={ma}
          zarolt={
            elso
              ? [
                  {
                    nev: elso.nev,
                    felelosNev: emberek.find((e) => e.id === elso.felelosId)?.nev,
                    allapotCimke: "Folyamatban",
                  },
                ]
              : []
          }
          onSablonokValtozott={async () => setSablonok(await folyamatSablonokAction())}
        />
      </section>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Mégse
        </Button>
        <Button type="submit" disabled={pending}>
          Folyamat indítása
        </Button>
      </div>
    </form>
  );
}
