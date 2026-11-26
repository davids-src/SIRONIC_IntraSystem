"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button, Input, Label, Textarea } from "@erp/ui";
import { JOTALLAS_EV_MAX } from "@erp/bizonylat/client";
import {
  createJotallasAction,
  saveJotallasiSzovegAction,
  type BizonylatFormState,
} from "../actions";
import {
  Field,
  FormSection,
  NativeSelect,
} from "@/app/(dashboard)/partner/_components/form-ui";

type Termek = { id: string; kod: string; nev: string };
type Sor = {
  key: string;
  termekNev: string;
  arlistaTermekId?: string;
  gyariSzam?: string;
  evek: number;
  kezdet: string;
};

let seq = 0;
const ma = () => new Date().toISOString().slice(0, 10);

export function JotallasForm({
  partnerek,
  termekek,
}: {
  partnerek: Array<{ id: string; nev: string }>;
  termekek: Termek[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createJotallasAction, {
    success: false,
  } as BizonylatFormState);
  const [sorok, setSorok] = useState<Sor[]>([]);
  const [kereses, setKereses] = useState("");

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push(`/bizonylat/jotallasok/${state.id}`);
    } else if (state.message) toast.error(state.message);
  }, [state, router]);

  const talalatok = useMemo(() => {
    const q = kereses.trim().toLowerCase();
    return q
      ? termekek.filter((t) => `${t.kod} ${t.nev}`.toLowerCase().includes(q)).slice(0, 10)
      : [];
  }, [kereses, termekek]);
  const err = (n: string) => (!state.success ? state.fieldErrors?.[n]?.[0] : undefined);
  const frissit = (key: string, m: Partial<Sor>) =>
    setSorok((l) => l.map((s) => (s.key === key ? { ...s, ...m } : s)));
  const uj = (m: Partial<Sor> = {}) =>
    setSorok((l) => [
      ...l,
      { key: `j${seq++}`, termekNev: "", evek: 2, kezdet: ma(), ...m },
    ]);
  const kuldendo = sorok.map((s) => {
    const r = { ...s } as Partial<Sor>;
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
            defaultValue=""
            placeholder="Válassz partnert"
            options={partnerek.map((p) => ({ value: p.id, label: p.nev }))}
          />
        </Field>
        <Field
          label="Kiállítás napja"
          htmlFor="kiallitasNap"
          required
          error={err("kiallitasNap")}
        >
          <Input id="kiallitasNap" name="kiallitasNap" type="date" defaultValue={ma()} />
        </Field>
        <Field label="Számlaszám (opcionális)" htmlFor="szamlaszam">
          <Input id="szamlaszam" name="szamlaszam" />
        </Field>
        <Field label="Megjegyzés" htmlFor="megjegyzes" className="sm:col-span-2">
          <Textarea id="megjegyzes" name="megjegyzes" rows={2} />
        </Field>
      </FormSection>

      <FormSection
        title="Tételek"
        description="Minden tételhez külön jótállási idő tartozik; a lejáratot a rendszer számolja."
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="termek-kereses">Termék keresése az árlistában</Label>
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
                      uj({ arlistaTermekId: t.id, termekNev: t.nev });
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
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => uj()}>
              <PlusIcon className="mr-1 size-4" />
              Kézi tétel
            </Button>
          </div>
        </div>
        {err("sorok") && <p className="text-destructive text-sm">{err("sorok")}</p>}
        {sorok.length === 0 ? (
          <p className="text-muted-foreground text-sm">Még nincs tétel.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="p-1">Termék</th>
                  <th className="p-1">Gyári szám</th>
                  <th className="p-1">Jótállás (év)</th>
                  <th className="p-1">Kezdete</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorok.map((s) => (
                  <tr key={s.key} className="border-t">
                    <td className="p-1">
                      <Input
                        aria-label="Termék"
                        value={s.termekNev}
                        onChange={(e) => frissit(s.key, { termekNev: e.target.value })}
                      />
                    </td>
                    <td className="w-40 p-1">
                      <Input
                        aria-label="Gyári szám"
                        value={s.gyariSzam ?? ""}
                        onChange={(e) =>
                          frissit(s.key, { gyariSzam: e.target.value || undefined })
                        }
                      />
                    </td>
                    <td className="w-24 p-1">
                      <Input
                        aria-label="Jótállás éve"
                        type="number"
                        min="1"
                        max={JOTALLAS_EV_MAX}
                        value={s.evek}
                        onChange={(e) => frissit(s.key, { evek: Number(e.target.value) })}
                      />
                    </td>
                    <td className="w-40 p-1">
                      <Input
                        aria-label="Kezdete"
                        type="date"
                        value={s.kezdet}
                        onChange={(e) => frissit(s.key, { kezdet: e.target.value })}
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
          Jótállási jegy kiállítása
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}

/** Settings: the editable legal text printed on every newly issued warranty card. */
export function JogiSzovegForm({ szoveg }: { szoveg: string }) {
  const [state, formAction, pending] = useActionState(saveJotallasiSzovegAction, {
    success: false,
  } as BizonylatFormState);
  useEffect(() => {
    if (state.success) toast.success(state.message);
    else if (state.message) toast.error(state.message);
  }, [state]);
  const hiba = !state.success ? state.fieldErrors?.szoveg?.[0] : undefined;
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Field label="Jótállási jegy jogi szövege" htmlFor="szoveg" required error={hiba}>
        <Textarea id="szoveg" name="szoveg" rows={14} defaultValue={szoveg} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          Mentés
        </Button>
      </div>
    </form>
  );
}
