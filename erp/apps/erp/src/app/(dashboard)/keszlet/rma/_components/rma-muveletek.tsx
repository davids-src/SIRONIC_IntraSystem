"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@erp/ui";
import { RMA_ALLAPOT_LABELS, type RmaAllapot } from "@erp/keszlet/client";
import { getFelhasznalokAction, rmaAtadAction, rmaAtmenetAction } from "../../actions";
import { SELECT_CLASS, toastResult } from "../../_components/run";

/** Status transition buttons (only the allowed next states) and the owner picker of an RMA case. */
export function RmaMuveletek({
  id,
  atmenetek,
  aktiv,
  beszallitoNev,
}: {
  id: string;
  atmenetek: RmaAllapot[];
  aktiv: boolean;
  beszallitoNev?: string;
}) {
  const router = useRouter();
  const [cel, setCel] = useState<RmaAllapot | "atad" | null>(null);
  const [jegyzet, setJegyzet] = useState("");
  const [besz, setBesz] = useState(beszallitoNev ?? "");
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [userId, setUserId] = useState("");
  const [pending, start] = useTransition();

  const nyit = (c: RmaAllapot | "atad") => {
    setCel(c);
    setJegyzet("");
    if (c === "atad" && users.length === 0) void getFelhasznalokAction().then(setUsers);
  };
  const kuld = () =>
    start(async () => {
      if (!cel) return;
      const r =
        cel === "atad"
          ? await rmaAtadAction(id, userId)
          : await rmaAtmenetAction(id, cel, { jegyzet, beszallitoNev: besz });
      if (toastResult(r)) {
        setCel(null);
        router.refresh();
      }
    });

  return (
    <>
      <div data-export="skip" className="flex flex-wrap gap-2">
        {atmenetek.map((a) => (
          <Button key={a} variant="outline" onClick={() => nyit(a)}>
            {RMA_ALLAPOT_LABELS[a]}
          </Button>
        ))}
        {aktiv && (
          <Button variant="outline" onClick={() => nyit("atad")}>
            Felelős kijelölése
          </Button>
        )}
      </div>
      <Dialog open={cel !== null} onOpenChange={(v) => !v && setCel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cel === "atad"
                ? "Felelős kijelölése"
                : cel
                  ? `Állapot: ${RMA_ALLAPOT_LABELS[cel]}`
                  : ""}
            </DialogTitle>
          </DialogHeader>
          {cel === "atad" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="rma-user">Felelős</Label>
              <select
                id="rma-user"
                className={SELECT_CLASS}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="">Válassz kollégát</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cel === "beszallitonak_kuldve" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="rma-besz2">Beszállító</Label>
                  <Input
                    id="rma-besz2"
                    value={besz}
                    onChange={(e) => setBesz(e.target.value)}
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="rma-jegyzet">Megjegyzés (opcionális)</Label>
                <Textarea
                  id="rma-jegyzet"
                  rows={2}
                  value={jegyzet}
                  onChange={(e) => setJegyzet(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCel(null)} disabled={pending}>
              Mégse
            </Button>
            <Button
              onClick={kuld}
              loading={pending}
              disabled={pending || (cel === "atad" && !userId)}
            >
              Mentés
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
