"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@erp/ui";
import { STACK_TIPUSOK, STACK_TIPUS_LABELS, type StackTipus } from "@erp/infra/client";
import { Field, SELECT_CLASS } from "../../eszkoz/_components/form/form-layout";
import {
  frissitStackAction,
  inditStackAction,
  konteinerFrissitAction,
  konteinerInditasAction,
  konteinerLeallitasAction,
  konteinerUjrainditAction,
  modositOldalAction,
  leallitStackAction,
  torolSablonAction,
  mentesStackAction,
  stackModositAction,
  stackNaploAction,
  szinkronAction,
  torolStackAction,
  type MuveletAllapot,
  type UrlapAllapot,
} from "../actions";

/** Runs a server action, toasts the outcome and refreshes the page data. */
export function useMuvelet() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const futtat = (f: () => Promise<MuveletAllapot>, utana?: string) =>
    start(async () => {
      const r = await f();
      if (r.success) {
        toast.success(r.message);
        if (utana) router.push(utana);
        else router.refresh();
      } else toast.error(r.message ?? "A művelet nem sikerült.");
    });
  return { pending, futtat };
}

export function SzinkronGomb() {
  const { pending, futtat } = useMuvelet();
  return (
    <Button
      variant="outline"
      loading={pending}
      title="Beolvassa a Portainer stackjeit, az NPM proxy hostjait és a Cloudflare DNS adatait, és frissíti a nyilvántartást. Semmit nem módosít a szolgáltatókon."
      onClick={() => futtat(() => szinkronAction())}
    >
      Szinkron a szolgáltatókkal
    </Button>
  );
}

export function StackGombok({
  id,
  fut,
  muvelhet,
}: {
  id: string;
  fut: boolean;
  muvelhet: boolean;
}) {
  const { pending, futtat } = useMuvelet();
  if (!muvelhet) return null;
  return (
    <>
      <Button
        loading={pending}
        title="Letölti a stack összes image-ének legfrissebb verzióját (pull), és újraindítja azokat a konténereket, amelyeknek az image-e megváltozott."
        onClick={() => {
          if (
            confirm(
              "Image-ek frissítése: letöltöm a legfrissebb image-eket, és újraindítom, aminek változott. A stack rövid időre elérhetetlen lehet. Folytatod?",
            )
          )
            futtat(() => frissitStackAction(id));
        }}
      >
        Image-ek frissítése
      </Button>
      {fut ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (
              confirm(
                "Leállítod a stack összes konténerét? A hozzá tartozó oldalak elérhetetlenné válnak.",
              )
            )
              futtat(() => leallitStackAction(id));
          }}
        >
          Leállítás
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => futtat(() => inditStackAction(id))}
        >
          Indítás
        </Button>
      )}
    </>
  );
}

export function KonteinerUjraindit({ id, konteiner }: { id: string; konteiner: string }) {
  const { pending, futtat } = useMuvelet();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      title="Csak ezt az egy konténert indítja újra (image-et nem tölt le)."
      onClick={() => futtat(() => konteinerUjrainditAction(id, konteiner))}
    >
      Újraindítás
    </Button>
  );
}

export function KonteinerInditLeallit({
  id,
  konteiner,
  fut,
}: {
  id: string;
  konteiner: string;
  fut: boolean;
}) {
  const { pending, futtat } = useMuvelet();
  return fut ? (
    <Button
      size="sm"
      variant="outline"
      loading={pending}
      title="Csak ezt a konténert állítja le; a stack többi konténere fut tovább. Az erre mutató oldalak elérhetetlenné válnak."
      onClick={() => futtat(() => konteinerLeallitasAction(id, konteiner))}
    >
      Leállítás
    </Button>
  ) : (
    <Button
      size="sm"
      variant="outline"
      loading={pending}
      title="Elindítja ezt a leállított konténert."
      onClick={() => futtat(() => konteinerInditasAction(id, konteiner))}
    >
      Indítás
    </Button>
  );
}

export function KonteinerFrissit({ id, konteiner }: { id: string; konteiner: string }) {
  const { pending, futtat } = useMuvelet();
  return (
    <Button
      size="sm"
      variant="outline"
      loading={pending}
      title="Letölti ennek az egy konténernek az image-ét, és csak akkor hozza létre újra, ha újabb van. A stack többi konténere érintetlen marad."
      onClick={() => futtat(() => konteinerFrissitAction(id, konteiner))}
    >
      Image frissítése
    </Button>
  );
}

/** Per-site partner: a stack can hold internal sites and several partners' sites side by side. */
export function OldalPartner({
  id,
  partnerId,
  partnerek,
  irhat,
  stackPartner,
}: {
  id: string;
  partnerId: string;
  partnerek: Array<{ id: string; nev: string }>;
  irhat: boolean;
  stackPartner?: string;
}) {
  const { pending, futtat } = useMuvelet();
  const nev = partnerek.find((p) => p.id === partnerId)?.nev;
  if (!irhat)
    return <span>{nev ?? (stackPartner ? `${stackPartner} (stack)` : "Belső")}</span>;
  return (
    <select
      className="border-input bg-background h-8 max-w-[14rem] rounded-md border px-2 text-sm"
      value={partnerId}
      disabled={pending}
      aria-label="Partner"
      onChange={(e) =>
        futtat(async () => {
          const r = await modositOldalAction(id, { partnerId: e.target.value });
          return {
            success: r.success,
            message: r.success ? "A partner módosítva." : r.message,
          };
        })
      }
    >
      <option value="">
        {stackPartner ? `${stackPartner} (a stacké)` : "Belső (nincs partner)"}
      </option>
      {partnerek.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nev}
        </option>
      ))}
    </select>
  );
}

export function NaploNezo({
  id,
  konteynerek,
}: {
  id: string;
  konteynerek: Array<{ nev: string }>;
}) {
  const [konteiner, setKonteiner] = useState(konteynerek[0]?.nev ?? "");
  const [tail, setTail] = useState(200);
  const [log, setLog] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (konteynerek.length === 0)
    return <p className="text-muted-foreground text-sm">Nincs konténer.</p>;
  const betolt = () =>
    start(async () => {
      const r = await stackNaploAction(id, konteiner, tail);
      if (r.success) setLog(r.log || "(üres napló)");
      else toast.error(r.message);
    });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Konténer" htmlFor="naplo-konteiner">
          <select
            id="naplo-konteiner"
            className={SELECT_CLASS}
            value={konteiner}
            onChange={(e) => setKonteiner(e.target.value)}
          >
            {konteynerek.map((k) => (
              <option key={k.nev}>{k.nev}</option>
            ))}
          </select>
        </Field>
        <Field label="Sorok" htmlFor="naplo-tail">
          <select
            id="naplo-tail"
            className={SELECT_CLASS}
            value={tail}
            onChange={(e) => setTail(Number(e.target.value))}
          >
            {[100, 200, 500, 1000].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Button variant="outline" loading={pending} onClick={betolt}>
          Napló betöltése
        </Button>
      </div>
      {log !== null && (
        <pre className="bg-muted max-h-96 overflow-auto rounded-md p-3 text-xs leading-relaxed whitespace-pre-wrap">
          {log}
        </pre>
      )}
    </div>
  );
}

/** Compose + env editor. Saving redeploys the stack on Portainer. */
export function StackKonfig({
  id,
  compose: eredetiCompose,
  env: eredetiEnv,
}: {
  id: string;
  compose: string;
  env: string;
}) {
  const [compose, setCompose] = useState(eredetiCompose);
  const [env, setEnv] = useState(eredetiEnv);
  const [pull, setPull] = useState(false);
  const { pending, futtat } = useMuvelet();
  const valtozott = compose !== eredetiCompose || env !== eredetiEnv;
  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Compose fájl"
        htmlFor="compose"
        hint="Egy stackben több service (image) lehet. A mentés után a Portainer újratelepíti a stacket."
      >
        <Textarea
          id="compose"
          rows={22}
          spellCheck={false}
          className="font-mono text-xs"
          value={compose}
          onChange={(e) => setCompose(e.target.value)}
        />
      </Field>
      <Field
        label="Környezeti változók (Portainer env)"
        htmlFor="env"
        hint="NEV=érték soronként. A compose fájlban ${NEV} formában használhatók. A lista teljes cseréje történik."
      >
        <Textarea
          id="env"
          rows={6}
          spellCheck={false}
          className="font-mono text-xs"
          value={env}
          onChange={(e) => setEnv(e.target.value)}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={pull}
          onChange={(e) => setPull(e.target.checked)}
        />
        Közben az image-eket is frissítse (pull)
      </label>
      <div className="flex gap-2">
        <Button
          loading={pending}
          disabled={!valtozott && !pull}
          onClick={() => futtat(() => mentesStackAction(id, compose, env, pull))}
        >
          Mentés és újratelepítés
        </Button>
        {valtozott && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setCompose(eredetiCompose);
              setEnv(eredetiEnv);
            }}
          >
            Változtatások elvetése
          </Button>
        )}
      </div>
    </div>
  );
}

export function StackAdatokForm({
  id,
  tipus,
  partnerId,
  leiras,
  partnerek,
}: {
  id: string;
  tipus: StackTipus;
  partnerId?: string;
  leiras?: string;
  partnerek: Array<{ id: string; nev: string }>;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(stackModositAction.bind(null, id), {
    success: false,
  } satisfies UrlapAllapot);
  useEffect(() => {
    if (state.success) {
      toast.success(state.message ?? "Mentve.");
      router.refresh();
    } else if (state.message) toast.error(state.message);
  }, [state, router]);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field
        label="Típus"
        htmlFor="tipus"
        hint="Projekt: egy projekt több image-gel. Szolgáltatás: egy szolgáltatás, amelyhez több oldal (partner) tartozik. Rendszer: saját infrastruktúra."
      >
        <select id="tipus" name="tipus" defaultValue={tipus} className={SELECT_CLASS}>
          {STACK_TIPUSOK.map((t) => (
            <option key={t} value={t}>
              {STACK_TIPUS_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Partner"
        htmlFor="partnerId"
        hint="Alapértelmezett partner az összes oldalra; az oldalnál felülírható."
      >
        <select
          id="partnerId"
          name="partnerId"
          defaultValue={partnerId ?? ""}
          className={SELECT_CLASS}
        >
          <option value="">— nincs —</option>
          {partnerek.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nev}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Megjegyzés" htmlFor="leiras" className="sm:col-span-2">
        <Input id="leiras" name="leiras" defaultValue={leiras ?? ""} maxLength={500} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" loading={pending}>
          Mentés
        </Button>
      </div>
    </form>
  );
}

/** Deletion that needs the exact name typed in — used for stacks. */
export function StackTorles({
  id,
  nev,
  oldalSzam,
}: {
  id: string;
  nev: string;
  oldalSzam: number;
}) {
  const [megerosit, setMegerosit] = useState("");
  const { pending, futtat } = useMuvelet();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        A stack végleges törlése a Portainerből (a konténerek leállnak és megszűnnek).
        {oldalSzam > 0 &&
          ` Előbb töröld vagy helyezd át a hozzá tartozó ${oldalSzam} oldalt.`}
      </p>
      <div className="flex gap-2">
        <Input
          placeholder={`Írd be a stack nevét: ${nev}`}
          value={megerosit}
          onChange={(e) => setMegerosit(e.target.value)}
        />
        <Button
          variant="destructive"
          loading={pending}
          disabled={megerosit !== nev || oldalSzam > 0}
          onClick={() => futtat(() => torolStackAction(id, megerosit), "/infra/stackek")}
        >
          Stack törlése
        </Button>
      </div>
    </div>
  );
}

export function SablonTorles({ id, nev }: { id: string; nev: string }) {
  const [megerosit, setMegerosit] = useState("");
  const { pending, futtat } = useMuvelet();
  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        A sablon törlése nem érinti a belőle létrehozott stackeket.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder={`Írd be a sablon nevét: ${nev}`}
          value={megerosit}
          onChange={(e) => setMegerosit(e.target.value)}
        />
        <Button
          variant="destructive"
          loading={pending}
          disabled={megerosit.trim() !== nev}
          onClick={() => futtat(() => torolSablonAction(id), "/infra/sablonok")}
        >
          Sablon törlése
        </Button>
      </div>
    </div>
  );
}

/** "Új stack" template picker: reloads the form prefilled from `?sablon=<id>`. */
export function SablonValasztek({
  sablonok,
  kivalasztott,
}: {
  sablonok: Array<{ id: string; nev: string }>;
  kivalasztott?: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="sablon" className="text-sm font-medium">
        Kiindulás sablonból
      </label>
      <select
        id="sablon"
        className={SELECT_CLASS}
        value={kivalasztott ?? ""}
        onChange={(e) =>
          router.push(
            e.target.value
              ? `/infra/stackek/new?sablon=${e.target.value}`
              : "/infra/stackek/new",
          )
        }
      >
        <option value="">— üres stack —</option>
        {sablonok.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nev}
          </option>
        ))}
      </select>
      <p className="text-muted-foreground text-xs">
        A sablon kiválasztása előtölti a compose fájlt és a környezeti változókat; az
        űrlapon utána szabadon módosíthatod.
      </p>
    </div>
  );
}
