"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@erp/ui";
import {
  createRmaAction,
  partnerOpciokAction,
  termekKeresAction,
  type TermekOpcio,
} from "../../actions";
import { SELECT_CLASS, toastResult } from "../../_components/run";

export function RmaForm() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [talalatok, setTalalatok] = useState<TermekOpcio[]>([]);
  const [termek, setTermek] = useState<TermekOpcio | null>(null);
  const [partnerek, setPartnerek] = useState<Array<{ id: string; nev: string }>>([]);
  const [partnerId, setPartnerId] = useState("");
  const [gyariSzam, setGyariSzam] = useState("");
  const [mennyiseg, setMennyiseg] = useState("1");
  const [beszallitoNev, setBeszallitoNev] = useState("");
  const [megjegyzes, setMegjegyzes] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    void partnerOpciokAction().then(setPartnerek);
  }, []);

  const kuld = () =>
    start(async () => {
      const partner = partnerek.find((p) => p.id === partnerId);
      const r = await createRmaAction({
        arlistaTermekId: termek?.id ?? "",
        termek: termek
          ? { nev: termek.nev, kod: termek.kod, egyseg: termek.egyseg }
          : { nev: "", kod: "", egyseg: "" },
        gyariSzam,
        mennyiseg,
        partnerId,
        partnerNev: partner?.nev ?? "",
        beszallitoNev,
        megjegyzes,
      });
      if (toastResult(r) && r.id) router.push(`/keszlet/rma/${r.id}`);
    });

  return (
    <div className="bg-card flex flex-col gap-4 rounded-xl border p-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="rma-termek">Termék *</Label>
        {termek ? (
          <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <span>
              <strong>{termek.nev}</strong>{" "}
              <span className="text-muted-foreground">{termek.kod}</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => setTermek(null)}>
              Csere
            </Button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                id="rma-termek"
                value={q}
                placeholder="Név vagy kód"
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  (e.preventDefault(),
                  start(async () => setTalalatok(await termekKeresAction(q))))
                }
              />
              <Button
                variant="outline"
                onClick={() =>
                  start(async () => setTalalatok(await termekKeresAction(q)))
                }
                disabled={pending}
              >
                Keresés
              </Button>
            </div>
            {talalatok.length > 0 && (
              <ul className="divide-y rounded-md border text-sm">
                {talalatok.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      className="hover:bg-muted w-full px-3 py-2 text-left"
                      onClick={() => {
                        setTermek(t);
                        setTalalatok([]);
                      }}
                    >
                      {t.nev} <span className="text-muted-foreground">{t.kod}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="rma-partner">Ügyfél (partner) *</Label>
          <select
            id="rma-partner"
            className={SELECT_CLASS}
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
          >
            <option value="">Válassz partnert</option>
            {partnerek.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nev}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rma-db">Mennyiség *</Label>
          <Input
            id="rma-db"
            type="number"
            min={1}
            value={mennyiseg}
            onChange={(e) => setMennyiseg(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rma-sn">Gyári szám</Label>
          <Input
            id="rma-sn"
            value={gyariSzam}
            onChange={(e) => setGyariSzam(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rma-besz">Beszállító</Label>
          <Input
            id="rma-besz"
            value={beszallitoNev}
            onChange={(e) => setBeszallitoNev(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="rma-megj">Megjegyzés</Label>
        <Textarea
          id="rma-megj"
          rows={3}
          value={megjegyzes}
          onChange={(e) => setMegjegyzes(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button
          onClick={kuld}
          loading={pending}
          disabled={pending || !termek || !partnerId}
        >
          RMA ügy felvétele
        </Button>
      </div>
    </div>
  );
}
