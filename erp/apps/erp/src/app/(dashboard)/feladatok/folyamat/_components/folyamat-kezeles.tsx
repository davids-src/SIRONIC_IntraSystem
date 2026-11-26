"use client";

import { useMemo, useState } from "react";
import { Button, Combobox, Input, Label } from "@erp/ui";
import {
  FOLYAMAT_LEPES_ALLAPOT_LABELS,
  type FolyamatLepesNezetAllapot,
} from "@erp/core/folyamat";
import type { FolyamatReszlet, FolyamatSablonSor } from "@erp/feladat/client";
import {
  FolyamatSzerkeszto,
  szerkesztoLepesek,
  ujSor,
  type FolyamatEmber,
  type FolyamatSzerkesztoSor,
} from "../../_components/folyamat-szerkeszto";
import { MegerositoGomb } from "../../_components/megerosito-gomb";
import { useFeladatMuvelet } from "../../_components/use-feladat-muvelet";
import {
  folyamatAtosztasAction,
  folyamatLepesekAction,
  folyamatMegszakitasAction,
  folyamatSablonokAction,
} from "../actions";

/**
 * The kiadó's controls on a Feladat-folyamat (#67): edit the steps not started yet, give the
 * running (or refused / stopped) step to someone else, stop the whole flow.
 */
export function FolyamatKezeles({
  folyamat: f,
  emberek,
  sablonok: kezdoSablonok,
  ma,
}: {
  folyamat: FolyamatReszlet;
  emberek: FolyamatEmber[];
  sablonok: FolyamatSablonSor[];
  ma: string;
}) {
  const { pending, futtat } = useFeladatMuvelet();
  const [sablonok, setSablonok] = useState(kezdoSablonok);
  const zarolt = f.szerkesztheto.filter((l) => l.zarolt);
  const kezdo = useMemo(
    () =>
      f.szerkesztheto
        .filter((l) => !l.zarolt)
        .map((l) =>
          ujSor({ id: l.id, nev: l.nev, felelosId: l.felelosId, hatarido: l.hatarido }),
        ),
    [f.szerkesztheto],
  );
  const [sorok, setSorok] = useState<FolyamatSzerkesztoSor[]>(kezdo);
  const valtozott =
    JSON.stringify(szerkesztoLepesek(sorok)) !== JSON.stringify(szerkesztoLepesek(kezdo));

  // The step waiting on someone: running, refused or withdrawn.
  const varo = f.szerkesztheto.find((l) =>
    ["aktiv", "elutasitva", "megszakitva"].includes(l.allapot),
  );
  const [ujFelelos, setUjFelelos] = useState("");
  const [ujFelelosSzoveg, setUjFelelosSzoveg] = useState("");
  const [indok, setIndok] = useState("");
  const options = useMemo(
    () => emberek.map((e) => ({ value: e.id, label: e.nev })),
    [emberek],
  );
  const nevOf = (id: string) => emberek.find((e) => e.id === id)?.nev;

  return (
    <div className="flex flex-col gap-4">
      {f.muveletek.megszakit && varo && (
        <section className="bg-card flex flex-col gap-3 rounded-lg border p-4">
          <div>
            <h2 className="text-sm font-semibold">
              {varo.allapot === "megszakitva" ? "Lépés újraindítása" : "Lépés átosztása"}
            </h2>
            <p className="text-muted-foreground text-xs">
              {varo.nev} — most: {nevOf(varo.felelosId) ?? "—"} (
              {FOLYAMAT_LEPES_ALLAPOT_LABELS[varo.allapot as FolyamatLepesNezetAllapot]})
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="flex flex-col gap-1">
              <Label>Új felelős</Label>
              <Combobox
                value={ujFelelosSzoveg}
                onChange={(t) => {
                  setUjFelelosSzoveg(t);
                  setUjFelelos(
                    emberek.find(
                      (e) =>
                        e.nev.toLocaleLowerCase("hu") ===
                        t.trim().toLocaleLowerCase("hu"),
                    )?.id ?? "",
                  );
                }}
                options={options}
                placeholder="Kolléga neve…"
                emptyMessage="Nincs ilyen kolléga"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Megjegyzés (opcionális)</Label>
              <Input
                value={indok}
                onChange={(e) => setIndok(e.target.value)}
                maxLength={500}
              />
            </div>
            <Button
              type="button"
              disabled={pending || !ujFelelos}
              onClick={() =>
                futtat(
                  () =>
                    folyamatAtosztasAction(f.id, varo.id, ujFelelos, indok || undefined),
                  (ok) => {
                    if (ok) {
                      setUjFelelos("");
                      setUjFelelosSzoveg("");
                      setIndok("");
                    }
                  },
                )
              }
            >
              {varo.allapot === "megszakitva" ? "Újraindítás" : "Átosztás"}
            </Button>
          </div>
          {varo.allapot === "megszakitva" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={pending}
              onClick={() =>
                futtat(() => folyamatAtosztasAction(f.id, varo.id, varo.felelosId))
              }
            >
              Újraindítás ugyanannak ({nevOf(varo.felelosId) ?? "felelős"})
            </Button>
          )}
        </section>
      )}

      {f.muveletek.szerkeszt && (
        <section className="bg-card flex flex-col gap-3 rounded-lg border p-4">
          <div>
            <h2 className="text-sm font-semibold">Lépések szerkesztése</h2>
            <p className="text-muted-foreground text-xs">
              A még el nem indult lépéseket módosíthatod: új lépés, törlés, sorrend,
              felelős, határidő. Az elindult lépések zárolva vannak.
              {f.lezart && " Új lépés hozzáadásával a kész folyamat folytatódik."}
            </p>
          </div>
          <FolyamatSzerkeszto
            sorok={sorok}
            onChange={setSorok}
            emberek={emberek}
            sablonok={sablonok}
            kezdoNap={ma}
            zarolt={zarolt.map((l) => ({
              nev: l.nev,
              felelosNev: nevOf(l.felelosId),
              allapotCimke:
                FOLYAMAT_LEPES_ALLAPOT_LABELS[l.allapot as FolyamatLepesNezetAllapot],
            }))}
            onSablonokValtozott={async () => setSablonok(await folyamatSablonokAction())}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={!valtozott || pending}
              onClick={() => setSorok(kezdo)}
            >
              Visszaállítás
            </Button>
            <Button
              type="button"
              disabled={!valtozott || pending}
              onClick={() =>
                futtat(() => folyamatLepesekAction(f.id, szerkesztoLepesek(sorok)))
              }
            >
              Lépések mentése
            </Button>
          </div>
        </section>
      )}

      {f.muveletek.megszakit && (
        <div className="flex justify-end">
          <MegerositoGomb
            cimke="Folyamat megszakítása"
            variant="ghost"
            cim="Megszakítod a folyamatot?"
            leiras="A futó lépés feladatát visszavonjuk, a további lépések nem indulnak el."
            megerosites="Megszakítom"
            okMezo
            onConfirm={(ok) => folyamatMegszakitasAction(f.id, ok)}
          />
        </div>
      )}
    </div>
  );
}
