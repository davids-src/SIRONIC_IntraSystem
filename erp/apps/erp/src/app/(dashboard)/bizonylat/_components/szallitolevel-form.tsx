"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button, Input, Label, Textarea } from "@erp/ui";
import type { SzallitolevelDetail, SzallitolevelSor } from "@erp/bizonylat/client";
import {
  createSzallitolevelAction,
  updateSzallitolevelAction,
  type BizonylatFormState,
} from "../actions";
import {
  Field,
  FormSection,
  NativeSelect,
} from "@/app/(dashboard)/partner/_components/form-ui";

type Termek = { id: string; kod: string; nev: string; egyseg: string };
type SorAllapot = SzallitolevelSor & { key: string };

let seq = 0;
const day = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const ma = () => new Date().toISOString().slice(0, 10);

export function SzallitolevelForm({
  szallitolevel,
  partnerek,
  termekek,
}: {
  szallitolevel?: SzallitolevelDetail;
  partnerek: Array<{ id: string; nev: string }>;
  termekek: Termek[];
}) {
  const router = useRouter();
  const action = szallitolevel
    ? updateSzallitolevelAction.bind(null, szallitolevel.id)
    : createSzallitolevelAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } as BizonylatFormState);
  const [sorok, setSorok] = useState<SorAllapot[]>(
    () => szallitolevel?.sorok.map((s) => ({ ...s, key: `s${seq++}` })) ?? [],
  );
  const [kereses, setKereses] = useState("");

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push(`/bizonylat/szallitolevelek/${state.id}`);
    } else if (state.message) toast.error(state.message);
  }, [state, router]);

  const talalatok = useMemo(() => {
    const q = kereses.trim().toLowerCase();
    return q
      ? termekek.filter((t) => `${t.kod} ${t.nev}`.toLowerCase().includes(q)).slice(0, 10)
      : [];
  }, [kereses, termekek]);
  const err = (n: string) => (!state.success ? state.fieldErrors?.[n]?.[0] : undefined);
  const frissit = (key: string, m: Partial<SorAllapot>) =>
    setSorok((l) => l.map((s) => (s.key === key ? { ...s, ...m } : s)));
  const kuldendo = sorok.map((s) => {
    const r = { ...s } as Partial<SorAllapot>;
    delete r.key;
    return r;
  });

  return (
    <form action={formAction} className="flex flex-col gap-4 md:gap-5">
      <input type="hidden" name="sorok" value={JSON.stringify(kuldendo)} />
      {state.success === false && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      <FormSection title="Fejléc" columns={2}>
        <Field label="Partner" htmlFor="partnerId" required error={err("partnerId")}>
          <NativeSelect
            id="partnerId"
            name="partnerId"
            defaultValue={szallitolevel?.partnerId ?? ""}
            placeholder="Válassz partnert"
            options={partnerek.map((p) => ({ value: p.id, label: p.nev }))}
          />
        </Field>
        <Field label="Kiadás napja" htmlFor="kiadasNap" required error={err("kiadasNap")}>
          <Input
            id="kiadasNap"
            name="kiadasNap"
            type="date"
            defaultValue={day(szallitolevel?.kiadasNap) || ma()}
          />
        </Field>
        <Field label="Projekt azonosító (opcionális)" htmlFor="projektId">
          <Input
            id="projektId"
            name="projektId"
            defaultValue={szallitolevel?.projektId}
          />
        </Field>
        <Field label="Megjegyzés" htmlFor="megjegyzes" className="sm:col-span-2">
          <Textarea
            id="megjegyzes"
            name="megjegyzes"
            rows={3}
            defaultValue={szallitolevel?.megjegyzes}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Tételek"
        description="Termékek az árlistából; a kiadás a készletből történik."
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="termek-kereses">Termék keresése</Label>
          <Input
            id="termek-kereses"
            value={kereses}
            onChange={(e) => setKereses(e.target.value)}
            placeholder="Kód vagy név…"
            autoComplete="off"
          />
          {talalatok.length > 0 && (
            <ul className="bg-card divide-y rounded-md border text-sm">
              {talalatok.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="hover:bg-muted w-full px-3 py-2 text-left"
                    onClick={() => {
                      setSorok((l) => [
                        ...l,
                        {
                          key: `s${seq++}`,
                          arlistaTermekId: t.id,
                          nev: t.nev,
                          mennyiseg: 1,
                          egyseg: t.egyseg,
                        },
                      ]);
                      setKereses("");
                    }}
                  >
                    <span className="text-muted-foreground mr-2 font-mono text-xs">
                      {t.kod}
                    </span>
                    {t.nev}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {err("sorok") && <p className="text-destructive text-sm">{err("sorok")}</p>}
        {sorok.length === 0 ? (
          <p className="text-muted-foreground text-sm">Még nincs tétel.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="p-1">Megnevezés</th>
                  <th className="p-1">Menny.</th>
                  <th className="p-1">Egység</th>
                  <th className="p-1">Raktárhely (opc.)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorok.map((s) => (
                  <tr key={s.key} className="border-t">
                    <td className="p-1">{s.nev}</td>
                    <td className="w-24 p-1">
                      <Input
                        aria-label="Mennyiség"
                        type="number"
                        min="0"
                        step="any"
                        value={s.mennyiseg}
                        onChange={(e) =>
                          frissit(s.key, { mennyiseg: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="w-24 p-1">
                      <Input
                        aria-label="Egység"
                        value={s.egyseg}
                        onChange={(e) => frissit(s.key, { egyseg: e.target.value })}
                      />
                    </td>
                    <td className="w-36 p-1">
                      <Input
                        aria-label="Raktárhely"
                        value={s.raktarhelyKod ?? ""}
                        onChange={(e) =>
                          frissit(s.key, { raktarhelyKod: e.target.value || undefined })
                        }
                      />
                    </td>
                    <td className="p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Tétel törlése"
                        onClick={() => setSorok((l) => l.filter((x) => x.key !== s.key))}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {szallitolevel ? "Szállítólevél mentése" : "Szállítólevél létrehozása"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
