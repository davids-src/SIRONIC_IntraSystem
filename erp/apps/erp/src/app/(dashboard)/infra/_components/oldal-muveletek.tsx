"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input } from "@erp/ui";
import type { EllenorzesTetel } from "@erp/infra";
import { Field, SELECT_CLASS } from "../../eszkoz/_components/form/form-layout";
import {
  ellenorizOldalAction,
  modositOldalAction,
  sslMegujitAction,
  torolOldalAction,
  type OldalMuveletEredmeny,
} from "../actions";
import { LepesLista, type StackValasztek } from "./oldal-urlap";
import { useMuvelet } from "./muveletek";

const IKON = { ok: "✓", figyelmeztetes: "!", hiba: "✗" } as const;
const SZIN = {
  ok: "text-success",
  figyelmeztetes: "text-warning",
  hiba: "text-destructive",
} as const;
const CIMKE = {
  dns: "DNS",
  ssl: "SSL",
  proxy: "Proxy",
  konteiner: "Konténer",
  elerheto: "Elérhetőség",
} as const;

export function OldalEllenorzes({ id }: { id: string }) {
  const [tetelek, setTetelek] = useState<EllenorzesTetel[] | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button
          variant="outline"
          loading={pending}
          title="Csak olvas: ellenőrzi a DNS rekordot, az NPM proxy hostot, az SSL érvényességét, a konténer állapotát és a weboldal elérhetőségét."
          onClick={() =>
            start(async () => {
              const r = await ellenorizOldalAction(id);
              if (r.success) setTetelek(r.tetelek ?? []);
              else toast.error(r.message);
            })
          }
        >
          Állapot ellenőrzése
        </Button>
      </div>
      {tetelek && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {tetelek.map((t) => (
            <li key={t.kulcs} className="flex gap-2">
              <span className={SZIN[t.szint]} aria-hidden>
                {IKON[t.szint]}
              </span>
              <span>
                <strong>{CIMKE[t.kulcs]}:</strong> {t.uzenet}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SslMegujitGomb({ id }: { id: string }) {
  const { pending, futtat } = useMuvelet();
  return (
    <Button
      variant="outline"
      loading={pending}
      title="Az NPM-ben azonnal megújítja a tanúsítványt (Let's Encrypt, DNS-01). Ha az oldalnak nincs, vagy már nem fedi le a hostneveit, újat állít ki."
      onClick={() => futtat(() => sslMegujitAction(id))}
    >
      SSL megújítása most
    </Button>
  );
}

/** Edit what the site points at and who it belongs to. Host changes re-run DNS + SSL. */
export function OldalSzerkeszto({
  id,
  kezdo,
  stackek,
  partnerek,
}: {
  id: string;
  kezdo: {
    nev: string;
    hostnevek: string[];
    stackId?: string;
    szolgaltatas: string;
    port: number;
    sema: "http" | "https";
    websocket: boolean;
    sslKikenyszer: boolean;
    partnerId?: string;
    megjegyzes?: string;
  };
  stackek: StackValasztek[];
  partnerek: Array<{ id: string; nev: string }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [stackId, setStackId] = useState(kezdo.stackId ?? "");
  const [szolgaltatas, setSzolgaltatas] = useState(kezdo.szolgaltatas);
  const [eredmeny, setEredmeny] = useState<OldalMuveletEredmeny | null>(null);
  const stack = useMemo(() => stackek.find((s) => s.id === stackId), [stackek, stackId]);

  function kuldes(fd: FormData) {
    const hostok = String(fd.get("hostnevek") ?? "")
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter(Boolean);
    start(async () => {
      const r = await modositOldalAction(id, {
        nev: String(fd.get("nev") ?? ""),
        hostnevek: hostok,
        stackId: stackId,
        szolgaltatas: szolgaltatas.trim(),
        port: Number(fd.get("port")),
        sema: String(fd.get("sema")) as "http" | "https",
        websocket: fd.get("websocket") === "on",
        sslKikenyszer: fd.get("sslKikenyszer") === "on",
        partnerId: String(fd.get("partnerId") ?? ""),
        megjegyzes: String(fd.get("megjegyzes") ?? ""),
      });
      setEredmeny(r);
      if (r.success) {
        toast.success("Az oldal módosítva.");
        router.refresh();
      } else toast.error(r.message ?? "A módosítás nem sikerült.");
    });
  }

  return (
    <form action={kuldes} className="grid gap-3 sm:grid-cols-2">
      <Field label="Megnevezés" htmlFor="nev">
        <Input id="nev" name="nev" defaultValue={kezdo.nev} maxLength={120} />
      </Field>
      <Field label="Partner" htmlFor="partnerId">
        <select
          id="partnerId"
          name="partnerId"
          className={SELECT_CLASS}
          defaultValue={kezdo.partnerId ?? ""}
        >
          <option value="">— a stackétől örökölt / nincs —</option>
          {partnerek.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nev}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label="Hostnevek"
        htmlFor="hostnevek"
        className="sm:col-span-2"
        hint="Ha módosítod, a DNS rekordok és az SSL tanúsítvány is újra beállításra kerül."
      >
        <Input
          id="hostnevek"
          name="hostnevek"
          defaultValue={kezdo.hostnevek.join(", ")}
        />
      </Field>
      <Field label="Stack" htmlFor="stack">
        <select
          id="stack"
          className={SELECT_CLASS}
          value={stackId}
          onChange={(e) => {
            setStackId(e.target.value);
            setSzolgaltatas("");
          }}
        >
          <option value="">— külső cél (nem stack) —</option>
          {stackek.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nev}
            </option>
          ))}
        </select>
      </Field>
      <Field
        label={stack ? "Szolgáltatás (konténer)" : "Cél host / IP"}
        htmlFor="szolgaltatas"
      >
        {stack ? (
          <select
            id="szolgaltatas"
            className={SELECT_CLASS}
            value={szolgaltatas}
            onChange={(e) => setSzolgaltatas(e.target.value)}
          >
            <option value="">— válassz —</option>
            {stack.szolgaltatasok.map((k) => (
              <option key={k.nev} value={k.nev}>
                {k.nev}
              </option>
            ))}
          </select>
        ) : (
          <Input
            id="szolgaltatas"
            value={szolgaltatas}
            onChange={(e) => setSzolgaltatas(e.target.value)}
          />
        )}
      </Field>
      <Field label="Port" htmlFor="port">
        <Input
          id="port"
          name="port"
          type="number"
          min={1}
          max={65535}
          defaultValue={kezdo.port}
          required
        />
      </Field>
      <Field label="Séma" htmlFor="sema">
        <select id="sema" name="sema" className={SELECT_CLASS} defaultValue={kezdo.sema}>
          <option value="http">http</option>
          <option value="https">https</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="websocket"
          defaultChecked={kezdo.websocket}
          className="size-4"
        />{" "}
        Websocket engedélyezése
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="sslKikenyszer"
          defaultChecked={kezdo.sslKikenyszer}
          className="size-4"
        />{" "}
        HTTP átirányítása HTTPS-re
      </label>
      <Field label="Megjegyzés" htmlFor="megjegyzes" className="sm:col-span-2">
        <Input
          id="megjegyzes"
          name="megjegyzes"
          defaultValue={kezdo.megjegyzes ?? ""}
          maxLength={500}
        />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <div>
          <Button type="submit" loading={pending}>
            Mentés
          </Button>
        </div>
        {eredmeny && (eredmeny.lepesek.length > 0 || eredmeny.message) && (
          <div className="rounded-md border p-3">
            <LepesLista lepesek={eredmeny.lepesek} />
            {!eredmeny.success && eredmeny.message && (
              <p className="text-destructive mt-2 text-sm">{eredmeny.message}</p>
            )}
          </div>
        )}
      </div>
    </form>
  );
}

export function OldalTorles({ id, fohost }: { id: string; fohost: string }) {
  const [megerosit, setMegerosit] = useState("");
  const [dns, setDns] = useState(false);
  const { pending, futtat } = useMuvelet();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-sm">
        Törli az NPM proxy hostot, így az oldal elérhetetlenné válik. A tanúsítvány
        megmarad.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4"
          checked={dns}
          onChange={(e) => setDns(e.target.checked)}
        />
        A Cloudflare DNS rekordokat is törölje
      </label>
      <div className="flex gap-2">
        <Input
          placeholder={`Írd be a fő hostnevet: ${fohost}`}
          value={megerosit}
          onChange={(e) => setMegerosit(e.target.value)}
        />
        <Button
          variant="destructive"
          loading={pending}
          disabled={megerosit.trim().toLowerCase() !== fohost}
          onClick={() =>
            futtat(() => torolOldalAction(id, dns, megerosit), "/infra/oldalak")
          }
        >
          Oldal törlése
        </Button>
      </div>
    </div>
  );
}
