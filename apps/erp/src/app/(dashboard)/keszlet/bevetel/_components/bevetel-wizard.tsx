"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Textarea } from "@erp/ui";
import { bevetelAction, termekKeresAction, type TermekOpcio } from "../../actions";
import { SELECT_CLASS, toastResult } from "../../_components/run";

type Sor = {
  termek: TermekOpcio;
  mennyiseg: string;
  raktarhelyKod: string;
  beszerzesiAr: string;
};

/** Receipt wizard: 1) pick products + quantities, 2) review and book. */
export function BevetelWizard({
  helyek,
  mutatAr,
}: {
  helyek: Array<{ kod: string; nev: string }>;
  mutatAr: boolean;
}) {
  const router = useRouter();
  const [lepes, setLepes] = useState<1 | 2>(1);
  const [q, setQ] = useState("");
  const [talalatok, setTalalatok] = useState<TermekOpcio[]>([]);
  const [sorok, setSorok] = useState<Sor[]>([]);
  const [megjegyzes, setMegjegyzes] = useState("");
  // One key per wizard run: a double submit or a retry is applied once by the facade.
  const [kulcs] = useState(() => crypto.randomUUID());
  const [pending, start] = useTransition();

  const keres = () => start(async () => setTalalatok(await termekKeresAction(q)));
  const hozzaad = (t: TermekOpcio) => {
    setSorok((s) =>
      s.some((x) => x.termek.id === t.id)
        ? s
        : [
            ...s,
            {
              termek: t,
              mennyiseg: "1",
              raktarhelyKod: helyek[0]?.kod ?? "",
              beszerzesiAr: "",
            },
          ],
    );
    setTalalatok([]);
    setQ("");
  };
  const frissit = (i: number, patch: Partial<Sor>) =>
    setSorok((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const ervenyes = sorok.length > 0 && sorok.every((s) => Number(s.mennyiseg) > 0);

  const rogzit = () =>
    start(async () => {
      const r = await bevetelAction(kulcs, {
        megjegyzes,
        sorok: sorok.map((s) => ({
          arlistaTermekId: s.termek.id,
          mennyiseg: s.mennyiseg,
          raktarhelyKod: s.raktarhelyKod,
          termek: { nev: s.termek.nev, kod: s.termek.kod, egyseg: s.termek.egyseg },
          beszerzesiAr: mutatAr && s.beszerzesiAr !== "" ? s.beszerzesiAr : undefined,
        })),
      });
      if (toastResult(r)) router.push("/keszlet/lista");
    });

  return (
    <div className="flex flex-col gap-4">
      {lepes === 1 ? (
        <>
          <section className="bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-sm">
            <Label htmlFor="termek-kereso">Termék keresése az árlistában</Label>
            <div className="flex gap-2">
              <Input
                id="termek-kereso"
                value={q}
                placeholder="Név vagy kód"
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), keres())}
              />
              <Button type="button" variant="outline" onClick={keres} disabled={pending}>
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
                      onClick={() => hozzaad(t)}
                    >
                      <span className="font-medium">{t.nev}</span>{" "}
                      <span className="text-muted-foreground">
                        {t.kod} · {t.egyseg}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-sm">
            <h2 className="font-semibold">Bevételezendő tételek</h2>
            {sorok.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Még nincs tétel — keress rá egy termékre.
              </p>
            )}
            {sorok.map((s, i) => (
              <div
                key={s.termek.id}
                className="grid grid-cols-2 items-end gap-3 border-b pb-3 md:grid-cols-5"
              >
                <div className="col-span-2 text-sm">
                  <div className="font-medium">{s.termek.nev}</div>
                  <div className="text-muted-foreground">{s.termek.kod}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Mennyiség ({s.termek.egyseg})</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={s.mennyiseg}
                    onChange={(e) => frissit(i, { mennyiseg: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Raktárhely</Label>
                  <select
                    className={SELECT_CLASS}
                    value={s.raktarhelyKod}
                    onChange={(e) => frissit(i, { raktarhelyKod: e.target.value })}
                  >
                    <option value="">Nincs hozzárendelve</option>
                    {helyek.map((h) => (
                      <option key={h.kod} value={h.kod}>
                        {h.kod} — {h.nev}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  {mutatAr && (
                    <div className="flex flex-col gap-1">
                      <Label>Nettó beszerzési ár</Label>
                      <Input
                        type="number"
                        min={0}
                        value={s.beszerzesiAr}
                        onChange={(e) => frissit(i, { beszerzesiAr: e.target.value })}
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSorok((x) => x.filter((_, j) => j !== i))}
                  >
                    Törlés
                  </Button>
                </div>
              </div>
            ))}
          </section>
          <div className="flex justify-end">
            <Button disabled={!ervenyes} onClick={() => setLepes(2)}>
              Tovább az ellenőrzéshez
            </Button>
          </div>
        </>
      ) : (
        <>
          <section className="bg-card flex flex-col gap-3 rounded-xl border p-5 shadow-sm">
            <h2 className="font-semibold">Ellenőrzés</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {sorok.map((s) => (
                <li key={s.termek.id}>
                  <strong>
                    {s.mennyiseg} {s.termek.egyseg}
                  </strong>{" "}
                  — {s.termek.nev} → {s.raktarhelyKod || "nincs raktárhely"}
                </li>
              ))}
            </ul>
            <Label htmlFor="megjegyzes">Megjegyzés (opcionális)</Label>
            <Textarea
              id="megjegyzes"
              rows={2}
              value={megjegyzes}
              onChange={(e) => setMegjegyzes(e.target.value)}
            />
          </section>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setLepes(1)} disabled={pending}>
              Vissza
            </Button>
            <Button onClick={rogzit} loading={pending} disabled={pending}>
              Bevételezés rögzítése
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
