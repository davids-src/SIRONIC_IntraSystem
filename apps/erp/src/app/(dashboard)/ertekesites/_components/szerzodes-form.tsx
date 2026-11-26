"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Checkbox, Input, Textarea } from "@erp/ui";
import {
  ALAIRAS_TIPUSOK,
  ALAIRAS_TIPUS_LABELS,
  SZERZODES_TIPUSOK,
  SZERZODES_TIPUS_LABELS,
  kitoltendoValtozok,
  szerzodesRender,
  type SzerzodesDetail,
  type SzerzodesSablonDto,
} from "@erp/ertekesites/client";
import {
  createSzerzodesAction,
  updateSzerzodesAction,
  type ErtekesitesFormState,
} from "../actions";
import {
  Field,
  FormSection,
  NativeSelect,
} from "@/app/(dashboard)/partner/_components/form-ui";

const day = (iso?: string) => (iso ? iso.slice(0, 10) : "");

/**
 * Contract form. The type is locked on edit. For a generated contract the variable inputs are
 * derived from the template body and the text is re-rendered (preview here, authoritative on the
 * server) on every save.
 */
export function SzerzodesForm({
  szerzodes,
  sablonok,
  partnerek,
  sablonSzoveg,
}: {
  szerzodes?: SzerzodesDetail;
  sablonok: SzerzodesSablonDto[];
  partnerek: Array<{ id: string; nev: string }>;
  /** Frozen template body of the edited contract (edit mode only). */
  sablonSzoveg?: string;
}) {
  const router = useRouter();
  const action = szerzodes
    ? updateSzerzodesAction.bind(null, szerzodes.id)
    : createSzerzodesAction;
  const [state, formAction, pending] = useActionState(action, {
    success: false,
  } as ErtekesitesFormState);

  const [tipus, setTipus] = useState<string>(szerzodes?.tipus ?? "generalt");
  const [sablonId, setSablonId] = useState(szerzodes?.sablonId ?? "");
  const [partnerId, setPartnerId] = useState(szerzodes?.partnerId ?? "");
  const [valtozok, setValtozok] = useState<Record<string, string>>(
    szerzodes?.valtozok ?? {},
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      router.push(`/ertekesites/szerzodesek/${state.id}`);
    } else if (state.message) toast.error(state.message);
  }, [state, router]);

  const sablon = sablonok.find((s) => s.id === sablonId);
  const szoveg = szerzodes ? (sablonSzoveg ?? "") : (sablon?.szoveg ?? "");
  const mezok = useMemo(() => kitoltendoValtozok(szoveg), [szoveg]);
  const partnerNev = partnerek.find((p) => p.id === partnerId)?.nev ?? "";
  const elonezet = useMemo(
    () =>
      tipus === "generalt"
        ? szerzodesRender(szoveg, valtozok, { partner_nev: partnerNev })
        : "",
    [tipus, szoveg, valtozok, partnerNev],
  );
  const err = (n: string) => (!state.success ? state.fieldErrors?.[n]?.[0] : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 md:gap-5">
      <input type="hidden" name="valtozok" value={JSON.stringify(valtozok)} />
      <input type="hidden" name="tipus" value={tipus} />
      {szerzodes && <input type="hidden" name="sablonId" value={sablonId} />}
      {state.success === false && state.message && (
        <p className="text-destructive text-sm">{state.message}</p>
      )}
      <FormSection title="Alapadatok" columns={2}>
        <Field label="Típus" htmlFor="tipus-valaszto">
          <NativeSelect
            id="tipus-valaszto"
            value={tipus}
            disabled={Boolean(szerzodes)}
            onChange={(e) => setTipus(e.target.value)}
            options={SZERZODES_TIPUSOK.map((t) => ({
              value: t,
              label: SZERZODES_TIPUS_LABELS[t],
            }))}
          />
        </Field>
        <Field label="Partner" htmlFor="partnerId" required error={err("partnerId")}>
          <NativeSelect
            id="partnerId"
            name="partnerId"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            placeholder="Válassz partnert"
            options={partnerek.map((p) => ({ value: p.id, label: p.nev }))}
          />
        </Field>
        <Field label="Szerződés neve" htmlFor="nev" required error={err("nev")}>
          <Input id="nev" name="nev" defaultValue={szerzodes?.nev} />
        </Field>
        <Field label="Kategória" htmlFor="kategoria" required error={err("kategoria")}>
          <Input
            id="kategoria"
            name="kategoria"
            defaultValue={szerzodes?.kategoria ?? sablon?.kategoria}
            key={sablon?.id ?? "nincs"}
          />
        </Field>
        <Field label="Aláírás módja" htmlFor="alairasTipus">
          <NativeSelect
            id="alairasTipus"
            name="alairasTipus"
            defaultValue={
              szerzodes?.alairasTipus ??
              (sablon?.digitalisAlairasKell ? "digitalis" : "nincs")
            }
            key={`al-${sablon?.id ?? "nincs"}`}
            options={ALAIRAS_TIPUSOK.map((t) => ({
              value: t,
              label: ALAIRAS_TIPUS_LABELS[t],
            }))}
          />
        </Field>
        <Field label="Projekt azonosító (opcionális)" htmlFor="projektId">
          <Input id="projektId" name="projektId" defaultValue={szerzodes?.projektId} />
        </Field>
        <Field label="Érvényesség kezdete" htmlFor="ervenyessegKezdete">
          <Input
            id="ervenyessegKezdete"
            name="ervenyessegKezdete"
            type="date"
            defaultValue={day(szerzodes?.ervenyessegKezdete)}
          />
        </Field>
        <Field label="Érvényesség vége" htmlFor="ervenyessegVege">
          <Input
            id="ervenyessegVege"
            name="ervenyessegVege"
            type="date"
            defaultValue={day(szerzodes?.ervenyessegVege)}
          />
        </Field>
        <Field label="Megjegyzés" htmlFor="megjegyzes" className="sm:col-span-2">
          <Textarea
            id="megjegyzes"
            name="megjegyzes"
            rows={2}
            defaultValue={szerzodes?.megjegyzes}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="portalLathato" defaultChecked={szerzodes?.portalLathato} />
          Látható a partnerportálon
        </label>
      </FormSection>

      {tipus === "generalt" ? (
        <FormSection
          title="Sablon és változók"
          description="A szöveg minden mentéskor újragenerálódik a sablonból."
        >
          {!szerzodes && (
            <Field label="Sablon" htmlFor="sablonId" required error={err("sablonId")}>
              <NativeSelect
                id="sablonId"
                name="sablonId"
                value={sablonId}
                onChange={(e) => {
                  setSablonId(e.target.value);
                  setValtozok({});
                }}
                placeholder="Válassz sablont"
                options={sablonok
                  .filter((s) => s.aktiv)
                  .map((s) => ({ value: s.id, label: `${s.kategoria} · ${s.nev}` }))}
              />
            </Field>
          )}
          {mezok.map((m) => (
            <Field key={m} label={m} htmlFor={`v-${m}`} required>
              <Input
                id={`v-${m}`}
                value={valtozok[m] ?? ""}
                onChange={(e) => setValtozok((v) => ({ ...v, [m]: e.target.value }))}
              />
            </Field>
          ))}
          {elonezet && (
            <div>
              <p className="text-muted-foreground mb-1 text-xs">Előnézet</p>
              <div
                className="bg-background max-h-96 overflow-auto rounded-md border p-4 text-sm"
                // Variable values are HTML-escaped and the HTML sanitized by szerzodesRender.
                dangerouslySetInnerHTML={{ __html: elonezet }}
              />
            </div>
          )}
        </FormSection>
      ) : (
        <FormSection
          title="Feltöltött szerződés"
          description="A PDF-et a médiatárba töltsd fel, és itt add meg a hivatkozását."
          columns={2}
        >
          <Field
            label="Fájl hivatkozása"
            htmlFor="fajlHivatkozas"
            required
            error={err("fajlHivatkozas")}
          >
            <Input
              id="fajlHivatkozas"
              name="fajlHivatkozas"
              defaultValue={szerzodes?.fajlHivatkozas}
            />
          </Field>
          <Field label="Fájl neve" htmlFor="fajlNev">
            <Input id="fajlNev" name="fajlNev" defaultValue={szerzodes?.fajlNev} />
          </Field>
        </FormSection>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {szerzodes ? "Szerződés mentése" : "Szerződés létrehozása"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Mégse
        </Button>
      </div>
    </form>
  );
}
