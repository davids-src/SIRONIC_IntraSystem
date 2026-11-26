"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@erp/ui";
import {
  FIZIKAI_ALLAPOTOK,
  FIZIKAI_ALLAPOT_LABELS,
  type EszkozAllapot,
  type FizikaiAllapot,
} from "@erp/eszkoz/client";
import {
  elveszettAction,
  getFelhasznalokAction,
  kiadasAction,
  kivonasAction,
  szervizKezdeteAction,
  szervizVegeAction,
  visszavetelAction,
  type MuveletState,
} from "../actions";

const SELECT_CLASS =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none";

/** Dialog shell: runs `run`, toasts the outcome, refreshes on success. */
function MuveletDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  destructive,
  canSubmit = true,
  run,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  destructive?: boolean;
  canSubmit?: boolean;
  run: () => Promise<MuveletState>;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submit = () =>
    startTransition(async () => {
      const r = await run();
      if (r.success) {
        toast.success(r.message);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(r.message ?? "A művelet nem sikerült.");
      }
    });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-3">{children}</div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Mégse
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={submit}
            loading={pending}
            disabled={pending || !canSubmit}
          >
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function JegyzetMezo({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="muvelet-jegyzet">Megjegyzés (opcionális)</Label>
      <Textarea
        id="muvelet-jegyzet"
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

type Nyitott =
  "kiadas" | "visszavetel" | "szerviz" | "szerviz-vege" | "elveszett" | "kivonas" | null;

export function MuveletGombok({
  id,
  allapot,
  canKiad,
  canWrite,
}: {
  id: string;
  allapot: EszkozAllapot;
  canKiad: boolean;
  canWrite: boolean;
}) {
  const [nyitott, setNyitott] = useState<Nyitott>(null);
  const [jegyzet, setJegyzet] = useState("");
  const [celUserId, setCelUserId] = useState("");
  const [fizikai, setFizikai] = useState<FizikaiAllapot>("jo");
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);

  const nyit = (n: Nyitott) => {
    setJegyzet("");
    setCelUserId("");
    setNyitott(n);
    if (n === "kiadas" && users.length === 0) void getFelhasznalokAction().then(setUsers);
  };
  const zar = (v: boolean) => {
    if (!v) setNyitott(null);
  };
  const j = jegyzet.trim() || undefined;

  if (allapot === "kivonva") return null;
  return (
    <>
      <div data-export="skip" className="flex flex-wrap gap-2">
        {canKiad && allapot === "raktaron" && (
          <Button onClick={() => nyit("kiadas")}>Kiadás</Button>
        )}
        {canKiad && allapot === "kiadva" && (
          <Button onClick={() => nyit("visszavetel")}>Visszavétel</Button>
        )}
        {canWrite && (allapot === "raktaron" || allapot === "kiadva") && (
          <Button variant="outline" onClick={() => nyit("szerviz")}>
            Szervizbe küldés
          </Button>
        )}
        {canWrite && allapot === "szervizben" && (
          <Button variant="outline" onClick={() => nyit("szerviz-vege")}>
            Szerviz lezárása
          </Button>
        )}
        {canWrite && allapot !== "elveszett" && (
          <Button variant="outline" onClick={() => nyit("elveszett")}>
            Elveszett
          </Button>
        )}
        {canWrite && (
          <Button variant="outline" onClick={() => nyit("kivonas")}>
            Kivonás
          </Button>
        )}
      </div>

      <MuveletDialog
        open={nyitott === "kiadas"}
        onOpenChange={zar}
        title="Eszköz kiadása"
        description="Az eszköz a kiválasztott kollégához kerül, ő értesítést kap."
        submitLabel="Kiadás"
        canSubmit={celUserId !== ""}
        run={() => kiadasAction(id, { celUserId, jegyzet: j })}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="cel-user">Kinek adod ki?</Label>
          <select
            id="cel-user"
            className={SELECT_CLASS}
            value={celUserId}
            onChange={(e) => setCelUserId(e.target.value)}
          >
            <option value="">Válassz kollégát</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <JegyzetMezo value={jegyzet} onChange={setJegyzet} />
      </MuveletDialog>

      <MuveletDialog
        open={nyitott === "visszavetel"}
        onOpenChange={zar}
        title="Eszköz visszavétele"
        description="Rögzítsd, milyen állapotban jött vissza az eszköz."
        submitLabel="Visszavétel"
        run={() => visszavetelAction(id, { fizikaiAllapot: fizikai, jegyzet: j })}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="fizikai">Fizikai állapot</Label>
          <select
            id="fizikai"
            className={SELECT_CLASS}
            value={fizikai}
            onChange={(e) => setFizikai(e.target.value as FizikaiAllapot)}
          >
            {FIZIKAI_ALLAPOTOK.map((k) => (
              <option key={k} value={k}>
                {FIZIKAI_ALLAPOT_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <JegyzetMezo value={jegyzet} onChange={setJegyzet} />
      </MuveletDialog>

      <MuveletDialog
        open={nyitott === "szerviz"}
        onOpenChange={zar}
        title="Szervizbe küldés"
        description="Ha az eszköz ki volt adva, a kiadás megszűnik."
        submitLabel="Szervizbe küldöm"
        run={() => szervizKezdeteAction(id, j)}
      >
        <JegyzetMezo value={jegyzet} onChange={setJegyzet} />
      </MuveletDialog>

      <MuveletDialog
        open={nyitott === "szerviz-vege"}
        onOpenChange={zar}
        title="Szerviz lezárása"
        description="Az eszköz visszakerül a raktárba."
        submitLabel="Lezárás"
        run={() => szervizVegeAction(id, j)}
      >
        <JegyzetMezo value={jegyzet} onChange={setJegyzet} />
      </MuveletDialog>

      <MuveletDialog
        open={nyitott === "elveszett"}
        onOpenChange={zar}
        title="Elveszettnek jelölés"
        description="Ha az eszköz kiadva volt, a kiadás megszűnik."
        submitLabel="Elveszettnek jelölöm"
        destructive
        run={() => elveszettAction(id, j)}
      >
        <JegyzetMezo value={jegyzet} onChange={setJegyzet} />
      </MuveletDialog>

      <MuveletDialog
        open={nyitott === "kivonas"}
        onOpenChange={zar}
        title="Eszköz kivonása"
        description="A kivont eszközön már nem végezhető művelet, de a története megmarad."
        submitLabel="Kivonom"
        destructive
        run={() => kivonasAction(id, j)}
      >
        <JegyzetMezo value={jegyzet} onChange={setJegyzet} />
      </MuveletDialog>
    </>
  );
}
