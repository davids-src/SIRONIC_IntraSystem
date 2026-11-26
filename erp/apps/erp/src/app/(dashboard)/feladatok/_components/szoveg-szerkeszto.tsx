"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";
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
import { FELADAT_CIM_MAX, FELADAT_SZOVEG_MAX } from "@erp/feladat/client";
import { feladatSzovegAction } from "../uzenet-actions";
import { useFeladatMuvelet } from "./use-feladat-muvelet";

/**
 * The kiadó corrects a typo or completes the task's title / description (#68) — on every copy
 * of a group. The change goes into the log and the felelősök are notified.
 */
export function FeladatSzovegSzerkeszto({
  id,
  cim,
  leiras = "",
}: {
  id: string;
  cim: string;
  leiras?: string;
}) {
  const [nyitva, setNyitva] = useState(false);
  const [ujCim, setUjCim] = useState(cim);
  const [ujLeiras, setUjLeiras] = useState(leiras);
  const { pending, futtat } = useFeladatMuvelet();
  const valtozott = ujCim.trim() !== cim || ujLeiras.trim() !== leiras.trim();

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setUjCim(cim);
          setUjLeiras(leiras);
          setNyitva(true);
        }}
        data-export="skip"
      >
        <PencilIcon className="size-4" aria-hidden /> Szöveg javítása
      </Button>
      <Dialog open={nyitva} onOpenChange={setNyitva}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cím és leírás</DialogTitle>
            <DialogDescription>
              Elírás javítása vagy kiegészítés. Minden résztvevő példányán változik, a
              naplóban látszik, és a felelősök értesítést kapnak.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              futtat(
                () =>
                  feladatSzovegAction(id, {
                    cim: ujCim.trim() !== cim ? ujCim : undefined,
                    leiras: ujLeiras.trim() !== leiras.trim() ? ujLeiras : undefined,
                  }),
                (ok) => ok && setNyitva(false),
              );
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`szoveg-cim-${id}`}>Feladat</Label>
              <Input
                id={`szoveg-cim-${id}`}
                value={ujCim}
                onChange={(e) => setUjCim(e.target.value)}
                maxLength={FELADAT_CIM_MAX}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`szoveg-leiras-${id}`}>Leírás</Label>
              <Textarea
                id={`szoveg-leiras-${id}`}
                value={ujLeiras}
                onChange={(e) => setUjLeiras(e.target.value)}
                rows={6}
                maxLength={FELADAT_SZOVEG_MAX}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNyitva(false)}
              >
                Mégse
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={pending || !valtozott || !ujCim.trim()}
              >
                Mentés
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
