"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
} from "@erp/ui";
import { foglalAction, foglalasFeloldasAction, setMinimumAction } from "../../actions";
import { toastResult } from "../../_components/run";

type Mod = "foglal" | "felold" | "minimum" | null;

/** Allocation dialog (foglalás / feloldás) and the minimum-level editor of one stock row. */
export function FoglalasGombok({
  id,
  szabad,
  foglalt,
  minimum,
  canFoglal,
  canWrite,
}: {
  id: string;
  szabad: number;
  foglalt: number;
  minimum?: number;
  canFoglal: boolean;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [mod, setMod] = useState<Mod>(null);
  const [mennyiseg, setMennyiseg] = useState("1");
  const [jegyzet, setJegyzet] = useState("");
  const [min, setMin] = useState(minimum === undefined ? "" : String(minimum));
  // One key per dialog opening: a double click re-sends the same key and is applied once.
  const [kulcs, setKulcs] = useState("");
  const [pending, start] = useTransition();

  const nyit = (m: Mod) => {
    setKulcs(crypto.randomUUID());
    setMennyiseg("1");
    setJegyzet("");
    setMod(m);
  };
  const kuldes = () =>
    start(async () => {
      const r =
        mod === "minimum"
          ? await setMinimumAction(id, { minimum: min })
          : mod === "foglal"
            ? await foglalAction(id, { mennyiseg, kulcs, jegyzet })
            : await foglalasFeloldasAction(id, { mennyiseg, kulcs, jegyzet });
      if (toastResult(r)) {
        setMod(null);
        router.refresh();
      }
    });

  const cim =
    mod === "foglal"
      ? "Készlet foglalása"
      : mod === "felold"
        ? "Foglalás feloldása"
        : "Minimum készletszint";

  return (
    <>
      <div data-export="skip" className="flex flex-wrap gap-2">
        {canFoglal && (
          <Button onClick={() => nyit("foglal")} disabled={szabad <= 0}>
            Foglalás
          </Button>
        )}
        {canFoglal && (
          <Button
            variant="outline"
            onClick={() => nyit("felold")}
            disabled={foglalt <= 0}
          >
            Foglalás feloldása
          </Button>
        )}
        {canWrite && (
          <Button variant="outline" onClick={() => nyit("minimum")}>
            Minimum beállítása
          </Button>
        )}
      </div>
      <Dialog open={mod !== null} onOpenChange={(v) => !v && setMod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cim}</DialogTitle>
            <DialogDescription>
              {mod === "foglal" && `Szabad készlet: ${szabad}. Többet nem foglalhatsz.`}
              {mod === "felold" && `Jelenleg foglalt: ${foglalt}.`}
              {mod === "minimum" &&
                "Ez alatt (vagy ezen) a tétel kritikusnak számít. Üresen hagyva nincs figyelés."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {mod === "minimum" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="min">Minimum</Label>
                <Input
                  id="min"
                  type="number"
                  min={0}
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="menny">Mennyiség</Label>
                  <Input
                    id="menny"
                    type="number"
                    min={0}
                    step="any"
                    value={mennyiseg}
                    onChange={(e) => setMennyiseg(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="jegyzet">Megjegyzés (opcionális)</Label>
                  <Textarea
                    id="jegyzet"
                    rows={2}
                    value={jegyzet}
                    onChange={(e) => setJegyzet(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMod(null)} disabled={pending}>
              Mégse
            </Button>
            <Button onClick={kuldes} loading={pending} disabled={pending}>
              Mentés
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
