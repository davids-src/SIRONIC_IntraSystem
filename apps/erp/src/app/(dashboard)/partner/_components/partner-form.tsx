"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button, Checkbox, Input, Label, Textarea } from "@erp/ui";
import {
  ALVALLALKOZOI_JELENLET_LABELS,
  ALVALLALKOZOI_MUNKATERULETEK,
  ALVALLALKOZOI_MUNKATERULET_LABELS,
  ALVALLALKOZOI_SZAMLAZASI_CIKLUS_LABELS,
  ARAZASI_SZERZODES_TIPUS_LABELS,
  PARTNER_SZEREP_LABELS,
  PARTNER_TIPUS_LABELS,
  UGYFEL_KATEGORIA_LABELS,
  type PartnerDetail,
} from "@erp/partner/client";
import {
  createPartnerAction,
  updatePartnerAction,
  type PartnerFormState,
} from "../actions";
import { Field, FormSection, NativeSelect } from "./form-ui";

const opts = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

type Sor = {
  key: string;
  nev: string;
  beosztas: string;
  telefon: string;
  email: string;
  elsodleges: boolean;
};
let seq = 0;
const ujSor = (k?: Partial<Sor>): Sor => ({
  key: `k${seq++}`,
  nev: k?.nev ?? "",
  beosztas: k?.beosztas ?? "",
  telefon: k?.telefon ?? "",
  email: k?.email ?? "",
  elsodleges: k?.elsodleges ?? false,
});

const day = (iso?: string) => (iso ? iso.slice(0, 10) : "");

function CimMezok({
  prefix,
  cim,
}: {
  prefix: string;
  cim?: { iranyitoszam?: string; varos?: string; utca?: string; orszag?: string };
}) {
  return (
    <>
      <Field label="Irányítószám" htmlFor={`${prefix}.iranyitoszam`}>
        <Input
          id={`${prefix}.iranyitoszam`}
          name={`${prefix}.iranyitoszam`}
          defaultValue={cim?.iranyitoszam}
        />
      </Field>
      <Field label="Város" htmlFor={`${prefix}.varos`}>
        <Input
          id={`${prefix}.varos`}
          name={`${prefix}.varos`}
          defaultValue={cim?.varos}
        />
      </Field>
      <Field label="Utca, házszám" htmlFor={`${prefix}.utca`}>
        <Input id={`${prefix}.utca`} name={`${prefix}.utca`} defaultValue={cim?.utca} />
      </Field>
      <Field label="Ország" htmlFor={`${prefix}.orszag`}>
        <Input
          id={`${prefix}.orszag`}
          name={`${prefix}.orszag`}
          defaultValue={cim?.orszag ?? "Magyarország"}
        />
      </Field>
    </>
  );
}

export function PartnerForm({ partner }: { partner?: PartnerDetail }) {
  const router = useRouter();
  const action = partner
    ? updatePartnerAction.bind(null, partner.id)
    : createPartnerAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } satisfies PartnerFormState);
  const [rows, setRows] = useState<Sor[]>(() =>
    partner && partner.kapcsolattartok.length > 0
      ? partner.kapcsolattartok.map((k) => ujSor(k))
      : [ujSor({ elsodleges: true })],
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      if (state.id) router.push(`/partner/${state.id}`);
    } else if (state.message) {
      toast.error(state.message);
    } else if (state.fieldErrors) {
      toast.error("A mentés sikertelen — ellenőrizd az adatokat.");
    }
  }, [state, router]);

  const fe = !state.success ? state.fieldErrors : undefined;
  const err = (key: string) => fe?.[key]?.[0];
  const patch = (key: string, p: Partial<Sor>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const setPrimary = (key: string) =>
    setRows((rs) => rs.map((r) => ({ ...r, elsodleges: r.key === key })));

  const payload = JSON.stringify(
    rows
      .filter((k) => k.nev.trim() || k.telefon.trim() || k.email.trim())
      .map(({ nev, beosztas, telefon, email, elsodleges }) => ({
        nev,
        beosztas,
        telefon,
        email,
        elsodleges,
      })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="kapcsolattartok" value={payload} />

      <FormSection title="Alapadatok" columns={2}>
        <Field label="Típus" htmlFor="tipus" required error={err("tipus")}>
          <NativeSelect
            id="tipus"
            name="tipus"
            defaultValue={partner?.tipus ?? "ceg"}
            options={opts(PARTNER_TIPUS_LABELS)}
          />
        </Field>
        <Field label="Név / cégnév" htmlFor="nev" required error={err("nev")}>
          <Input id="nev" name="nev" required defaultValue={partner?.nev} />
        </Field>
        <Field label="Rövid név" htmlFor="rovidNev" error={err("rovidNev")}>
          <Input id="rovidNev" name="rovidNev" defaultValue={partner?.rovidNev} />
        </Field>
        <Field label="Adószám" htmlFor="adoszam" error={err("adoszam")}>
          <Input id="adoszam" name="adoszam" defaultValue={partner?.adoszam} />
        </Field>
        <Field
          label="Cégjegyzékszám"
          htmlFor="cegjegyzekszam"
          error={err("cegjegyzekszam")}
        >
          <Input
            id="cegjegyzekszam"
            name="cegjegyzekszam"
            defaultValue={partner?.cegjegyzekszam}
          />
        </Field>
        <Field
          label="Bankszámlaszám"
          htmlFor="bankszamlaszam"
          error={err("bankszamlaszam")}
        >
          <Input
            id="bankszamlaszam"
            name="bankszamlaszam"
            defaultValue={partner?.bankszamlaszam}
          />
        </Field>
        <Field label="Telefon" htmlFor="telefon" error={err("telefon")}>
          <Input id="telefon" name="telefon" type="tel" defaultValue={partner?.telefon} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={err("email")}>
          <Input id="email" name="email" type="email" defaultValue={partner?.email} />
        </Field>
      </FormSection>

      <FormSection title="Székhely" columns={2}>
        <CimMezok prefix="szekhely" cim={partner?.szekhely} />
      </FormSection>

      <FormSection
        title="Számlázási cím"
        description="Csak akkor töltsd ki, ha eltér a székhelytől."
        columns={2}
      >
        <CimMezok prefix="szamlazasiCim" cim={partner?.szamlazasiCim} />
      </FormSection>

      <FormSection
        title="Kapcsolattartók"
        description="Egy kapcsolattartó az elsődleges — ő jelenik meg a listában."
      >
        {rows.map((k, i) => (
          <div
            key={k.key}
            className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]"
          >
            <Input
              aria-label={`${i + 1}. kapcsolattartó neve`}
              placeholder="Név"
              value={k.nev}
              onChange={(e) => patch(k.key, { nev: e.target.value })}
            />
            <Input
              aria-label={`${i + 1}. kapcsolattartó beosztása`}
              placeholder="Beosztás"
              value={k.beosztas}
              onChange={(e) => patch(k.key, { beosztas: e.target.value })}
            />
            <Input
              aria-label={`${i + 1}. kapcsolattartó telefonszáma`}
              placeholder="Telefon"
              type="tel"
              value={k.telefon}
              onChange={(e) => patch(k.key, { telefon: e.target.value })}
            />
            <Input
              aria-label={`${i + 1}. kapcsolattartó e-mail címe`}
              placeholder="E-mail"
              type="email"
              value={k.email}
              onChange={(e) => patch(k.key, { email: e.target.value })}
            />
            <Label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="elsodleges-valaszto"
                checked={k.elsodleges}
                onChange={() => setPrimary(k.key)}
              />
              Elsődleges
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Kapcsolattartó törlése"
              onClick={() => setRows((rs) => rs.filter((r) => r.key !== k.key))}
            >
              <Trash2Icon className="size-4" />
            </Button>
            {Object.entries(fe ?? {})
              .filter(([key]) => key.startsWith(`kapcsolattartok.${i}.`))
              .map(([key, msgs]) => (
                <p key={key} className="text-destructive text-sm sm:col-span-6">
                  {msgs[0]}
                </p>
              ))}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setRows((rs) => [...rs, ujSor()])}
        >
          <PlusIcon className="mr-1 size-4" />
          Kapcsolattartó hozzáadása
        </Button>
      </FormSection>

      <FormSection
        title="Árazási profil"
        description="Az árlista ezek alapján választja ki a partnerre érvényes árszorzót."
        columns={2}
      >
        <Field
          label="Partner szerepe"
          htmlFor="partnerSzerep"
          error={err("partnerSzerep")}
        >
          <NativeSelect
            id="partnerSzerep"
            name="partnerSzerep"
            placeholder="— nincs megadva —"
            defaultValue={partner?.partnerSzerep ?? ""}
            options={opts(PARTNER_SZEREP_LABELS)}
          />
        </Field>
        <Field
          label="Ügyfélkategória"
          htmlFor="ugyfelKategoria"
          error={err("ugyfelKategoria")}
        >
          <NativeSelect
            id="ugyfelKategoria"
            name="ugyfelKategoria"
            placeholder="— nincs megadva —"
            defaultValue={partner?.ugyfelKategoria ?? ""}
            options={opts(UGYFEL_KATEGORIA_LABELS)}
          />
        </Field>
        <Field
          label="Árazási szerződéstípus"
          htmlFor="arazasiSzerzodesTipus"
          error={err("arazasiSzerzodesTipus")}
        >
          <NativeSelect
            id="arazasiSzerzodesTipus"
            name="arazasiSzerzodesTipus"
            placeholder="— nincs megadva —"
            defaultValue={partner?.arazasiSzerzodesTipus ?? ""}
            options={opts(ARAZASI_SZERZODES_TIPUS_LABELS)}
          />
        </Field>
        <Field
          label="Megújítási emlékeztető (nap)"
          htmlFor="megujitasEmlekeztetoNap"
          error={err("megujitasEmlekeztetoNap")}
        >
          <Input
            id="megujitasEmlekeztetoNap"
            name="megujitasEmlekeztetoNap"
            type="number"
            min={0}
            max={365}
            defaultValue={partner?.megujitasEmlekeztetoNap ?? 30}
          />
        </Field>
        <Field
          label="Szerződés kezdete"
          htmlFor="szerzodesKezdete"
          error={err("szerzodesKezdete")}
        >
          <Input
            id="szerzodesKezdete"
            name="szerzodesKezdete"
            type="date"
            defaultValue={day(partner?.szerzodesKezdete)}
          />
        </Field>
        <Field
          label="Szerződés vége"
          htmlFor="szerzodesVege"
          error={err("szerzodesVege")}
        >
          <Input
            id="szerzodesVege"
            name="szerzodesVege"
            type="date"
            defaultValue={day(partner?.szerzodesVege)}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Alvállalkozói adatok"
        description="Csak alvállalkozó-megbízó partnernél van jelentősége."
        columns={2}
      >
        <div className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-sm font-medium">Munkaterületek</span>
          <div className="flex flex-wrap gap-4">
            {ALVALLALKOZOI_MUNKATERULETEK.map((m) => (
              <Label key={m} className="flex items-center gap-2 text-sm font-normal">
                <Checkbox
                  name="alvallalkozoMunkateruletek"
                  value={m}
                  defaultChecked={partner?.alvallalkozoMunkateruletek?.includes(m)}
                />
                {ALVALLALKOZOI_MUNKATERULET_LABELS[m]}
              </Label>
            ))}
          </div>
        </div>
        <Field label="Jelenlét típusa" htmlFor="alvallalkozoJelenletTipus">
          <NativeSelect
            id="alvallalkozoJelenletTipus"
            name="alvallalkozoJelenletTipus"
            placeholder="— nincs megadva —"
            defaultValue={partner?.alvallalkozoJelenletTipus ?? ""}
            options={opts(ALVALLALKOZOI_JELENLET_LABELS)}
          />
        </Field>
        <Field label="Számlázási ciklus" htmlFor="alvallalkozoSzamlazasiCiklus">
          <NativeSelect
            id="alvallalkozoSzamlazasiCiklus"
            name="alvallalkozoSzamlazasiCiklus"
            placeholder="— nincs megadva —"
            defaultValue={partner?.alvallalkozoSzamlazasiCiklus ?? ""}
            options={opts(ALVALLALKOZOI_SZAMLAZASI_CIKLUS_LABELS)}
          />
        </Field>
      </FormSection>

      <FormSection title="Egyéb" columns={2}>
        <Field label="Címkék" htmlFor="cimkek" className="sm:col-span-2">
          <Input
            id="cimkek"
            name="cimkek"
            placeholder="vesszővel elválasztva"
            defaultValue={partner?.cimkek.join(", ")}
          />
        </Field>
        <Field
          label="Megjegyzés"
          htmlFor="megjegyzes"
          error={err("megjegyzes")}
          className="sm:col-span-2"
        >
          <Textarea
            id="megjegyzes"
            name="megjegyzes"
            rows={4}
            defaultValue={partner?.megjegyzes}
          />
        </Field>
      </FormSection>

      <div className="flex justify-end">
        <Button type="submit" loading={pending} disabled={pending} size="lg">
          {partner ? "Mentés" : "Partner felvétele"}
        </Button>
      </div>
    </form>
  );
}
