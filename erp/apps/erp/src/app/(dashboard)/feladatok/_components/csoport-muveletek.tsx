"use client";

import { useState, type ReactNode } from "react";
import { CalendarClockIcon, UserPlusIcon, XCircleIcon } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@erp/ui";
import { type FeladatCimzett, type FeladatPrioritas } from "@erp/feladat/client";
import {
  csoportVisszavonasAction,
  csoporttagHozzaadasAction,
  feladatModositasAction,
} from "../actions";
import { CimzettValaszto } from "./cimzett-valaszto";
import { MegerositoGomb } from "./megerosito-gomb";
import { PrioritasValaszto } from "./prioritas-valaszto";
import { KategoriaMezo } from "./kategoria-mezo";
import { useFeladatMuvelet } from "./use-feladat-muvelet";

type Ablak = "modosit" | "hozzaad" | null;

/**
 * The kiadó's actions on a task as a whole (8m, #61): deadline / priority / kategória for every
 * open copy, new members (a single task becomes a group), withdraw everyone. A message to
 * everyone is simply a message in the shared chat (#68).
 * `id` is any copy of the group — the facade resolves the group from it.
 */
export function CsoportMuveletek({
  id,
  cim,
  hatarido,
  prioritas,
  csoportos,
  kapcsolt,
  tagIds,
  nyitottDb,
  cimzettek,
  sajatId,
  ma,
  kategoria = "",
  kategoriak,
}: {
  id: string;
  cim: string;
  hatarido: string;
  prioritas: FeladatPrioritas;
  /** Current category and the ones used so far (#65). */
  kategoria?: string;
  kategoriak: string[];
  csoportos: boolean;
  kapcsolt: boolean;
  /** User ids already in the group — left out of the picker. */
  tagIds: string[];
  nyitottDb: number;
  cimzettek: FeladatCimzett[];
  sajatId: string;
  ma: string;
}) {
  const [ablak, setAblak] = useState<Ablak>(null);
  const { pending, futtat } = useFeladatMuvelet();
  const [ujHatarido, setUjHatarido] = useState(hatarido);
  const [ujPrioritas, setUjPrioritas] = useState<FeladatPrioritas>(prioritas);
  const [ujKategoria, setUjKategoria] = useState(kategoria);
  const kategoriaValtozott = ujKategoria.trim() !== kategoria;
  const [ujak, setUjak] = useState<string[]>([]);
  const bent = new Set(tagIds);
  const valaszthato = cimzettek.filter((c) => !bent.has(c.id));
  const kinek = csoportos ? `mind a(z) ${nyitottDb} nyitott példányon` : "a feladaton";

  const zar = () => setAblak(null);

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Kiadói műveletek">
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setUjHatarido(hatarido);
          setUjPrioritas(prioritas);
          setUjKategoria(kategoria);
          setAblak("modosit");
        }}
      >
        <CalendarClockIcon className="size-4" aria-hidden /> Határidő, prioritás,
        kategória
      </Button>
      {!kapcsolt && (
        <Button size="sm" variant="outline" onClick={() => setAblak("hozzaad")}>
          <UserPlusIcon className="size-4" aria-hidden /> Címzett hozzáadása
        </Button>
      )}
      {csoportos && (
        <MegerositoGomb
          cimke="Visszavonás mindenkitől"
          ikon={<XCircleIcon className="size-4" aria-hidden />}
          cim="Visszavonod a csoportos feladatot?"
          leiras={`„${cim}” lekerül mind a(z) ${nyitottDb} résztvevő listájáról, akinél még nyitott. A kész példányok megmaradnak.`}
          megerosites="Mindenkitől visszavonom"
          okMezo
          onConfirm={(indok) => csoportVisszavonasAction(id, indok)}
        />
      )}

      <Ablakos
        nyitva={ablak === "modosit"}
        onClose={zar}
        cim="Határidő, prioritás, kategória"
        leiras={`A változás ${kinek} érvényes; a résztvevők értesítést kapnak, a naplóban is látszik.`}
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            futtat(
              () =>
                feladatModositasAction(id, {
                  hatarido: ujHatarido !== hatarido ? ujHatarido : undefined,
                  prioritas: ujPrioritas !== prioritas ? ujPrioritas : undefined,
                  kategoria: kategoriaValtozott ? ujKategoria.trim() : undefined,
                }),
              (ok) => ok && zar(),
            );
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`modosit-hatarido-${id}`}>Határidő</Label>
            <Input
              id={`modosit-hatarido-${id}`}
              type="date"
              // An overdue deadline may stay as it is (only the priority changes).
              min={hatarido < ma ? hatarido : ma}
              value={ujHatarido}
              onChange={(e) => setUjHatarido(e.target.value)}
              className="w-44"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Prioritás</span>
            <PrioritasValaszto value={ujPrioritas} onChange={setUjPrioritas} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`modosit-kategoria-${id}`}>
              Kategória <span className="text-danger">*</span>
            </Label>
            <KategoriaMezo
              id={`modosit-kategoria-${id}`}
              value={ujKategoria}
              onChange={setUjKategoria}
              kategoriak={kategoriak}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={zar}>
              Mégse
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                pending ||
                (ujHatarido === hatarido &&
                  ujPrioritas === prioritas &&
                  !kategoriaValtozott)
              }
            >
              Mentés
            </Button>
          </div>
        </form>
      </Ablakos>

      <Ablakos
        nyitva={ablak === "hozzaad"}
        onClose={zar}
        cim="Címzett hozzáadása"
        leiras={
          csoportos
            ? "Mindenki saját példányt kap ugyanazzal a leírással, határidővel és csatolmányokkal, elfogadásra várva."
            : "A feladat csoportos lesz: a mostani felelős lesz az elsődleges felelős, az újak közreműködők."
        }
      >
        <div className="flex flex-col gap-3">
          <CimzettValaszto
            emberek={valaszthato}
            sajatId={sajatId}
            value={ujak}
            onChange={setUjak}
            magamnak={!bent.has(sajatId)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={zar}>
              Mégse
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || ujak.length === 0}
              onClick={() =>
                futtat(
                  () => csoporttagHozzaadasAction(id, ujak),
                  (ok) => {
                    if (!ok) return;
                    setUjak([]);
                    zar();
                  },
                )
              }
            >
              {ujak.length > 1 ? `${ujak.length} fő hozzáadása` : "Hozzáadom"}
            </Button>
          </div>
        </div>
      </Ablakos>
    </div>
  );
}

function Ablakos({
  nyitva,
  onClose,
  cim,
  leiras,
  children,
}: {
  nyitva: boolean;
  onClose: () => void;
  cim: string;
  leiras: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={nyitva} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cim}</DialogTitle>
          <DialogDescription>{leiras}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
