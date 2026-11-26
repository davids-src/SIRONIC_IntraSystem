"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@erp/ui";
import { DNS_TIPUSOK } from "@erp/infra/client";
import { Field, SELECT_CLASS } from "../../eszkoz/_components/form/form-layout";
import { ujOldalAction, type OldalMuveletEredmeny } from "../actions";

export type StackValasztek = {
  id: string;
  nev: string;
  partnerId?: string;
  szolgaltatasok: Array<{ nev: string; allapot: string; portok: string[] }>;
};

const LEPES_CIMKE = {
  dns: "Cloudflare DNS",
  ssl: "SSL tanúsítvány",
  proxy: "NPM proxy host",
} as const;

export function LepesLista({ lepesek }: { lepesek: OldalMuveletEredmeny["lepesek"] }) {
  if (lepesek.length === 0) return null;
  return (
    <ol className="flex flex-col gap-1.5 text-sm">
      {lepesek.map((l) => (
        <li key={l.kulcs} className="flex gap-2">
          <span className={l.ok ? "text-success" : "text-destructive"} aria-hidden>
            {l.ok ? "✓" : "✗"}
          </span>
          <span>
            <strong>{LEPES_CIMKE[l.kulcs]}:</strong> {l.uzenet}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * "Új oldal": one form for the whole publish flow — DNS record, certificate (an existing one that
 * covers the names is reused) and the proxy host to the chosen service of a stack.
 */
export function OldalUrlap({
  stackek,
  partnerek,
  dnsAlap,
  kezdoStackId,
}: {
  stackek: StackValasztek[];
  partnerek: Array<{ id: string; nev: string }>;
  dnsAlap: { tipus: "A" | "CNAME"; cel: string; proxied: boolean } | null;
  kezdoStackId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [stackId, setStackId] = useState(kezdoStackId ?? "");
  const [szolgaltatas, setSzolgaltatas] = useState("");
  const [eredmeny, setEredmeny] = useState<OldalMuveletEredmeny | null>(null);
  const stack = useMemo(() => stackek.find((s) => s.id === stackId), [stackek, stackId]);
  const valasztott = stack?.szolgaltatasok.find((k) => k.nev === szolgaltatas);

  function kuldes(fd: FormData) {
    const hostok = String(fd.get("hostnevek") ?? "")
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter(Boolean);
    const dnsCel = String(fd.get("dnsCel") ?? "").trim();
    start(async () => {
      const r = await ujOldalAction({
        hostnevek: hostok,
        nev: String(fd.get("nev") ?? "").trim() || undefined,
        stackId: stackId || undefined,
        szolgaltatas: szolgaltatas.trim(),
        port: Number(fd.get("port")),
        sema: String(fd.get("sema") ?? "http") as "http" | "https",
        websocket: fd.get("websocket") === "on",
        sslKikenyszer: fd.get("sslKikenyszer") === "on",
        partnerId: String(fd.get("partnerId") ?? "") || undefined,
        megjegyzes: String(fd.get("megjegyzes") ?? "").trim() || undefined,
        dns: dnsCel
          ? {
              tipus: String(fd.get("dnsTipus")) as "A" | "CNAME",
              cel: dnsCel,
              proxied: fd.get("dnsProxied") === "on",
            }
          : undefined,
        letsencryptEmail: String(fd.get("email") ?? "").trim() || undefined,
      });
      setEredmeny(r);
      if (r.success) {
        toast.success("Az oldal közzétéve.");
        router.refresh();
      } else toast.error(r.message ?? "Az oldal létrehozása nem sikerült.");
    });
  }

  return (
    <form action={kuldes} className="flex flex-col gap-5">
      <section className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Hostnevek"
          htmlFor="hostnevek"
          required
          className="sm:col-span-2"
          hint="Soronként vagy vesszővel elválasztva. Az első a fő hostnév, a többi alias (pl. a www. változat) — mind ugyanarra a szolgáltatásra mutat."
        >
          <Textarea
            id="hostnevek"
            name="hostnevek"
            rows={3}
            placeholder={"pelda.hu\nwww.pelda.hu"}
            required
          />
        </Field>
        <Field label="Megnevezés" htmlFor="nev" hint="Üresen a fő hostnév.">
          <Input id="nev" name="nev" maxLength={120} />
        </Field>
        <Field
          label="Partner"
          htmlFor="partnerId"
          hint="Üresen a stack partnere érvényes."
        >
          <select
            id="partnerId"
            name="partnerId"
            className={SELECT_CLASS}
            defaultValue=""
          >
            <option value="">— a stackétől örökölt / nincs —</option>
            {partnerek.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nev}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <h2 className="text-sm font-semibold sm:col-span-2">Hova mutasson?</h2>
        <Field
          label="Stack"
          htmlFor="stack"
          hint="Az a stack, amelyiknek a szolgáltatására az oldal mutat."
        >
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
          required
          hint={
            stack
              ? "A stack konténerei közül; a név a közös hálózaton érhető el."
              : "Pl. 192.168.0.15 vagy egy belső hostnév."
          }
        >
          {stack ? (
            <select
              id="szolgaltatas"
              className={SELECT_CLASS}
              value={szolgaltatas}
              onChange={(e) => setSzolgaltatas(e.target.value)}
              required
            >
              <option value="">— válassz —</option>
              {stack.szolgaltatasok.map((k) => (
                <option key={k.nev} value={k.nev}>
                  {k.nev}
                  {k.allapot !== "running" ? ` (${k.allapot})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id="szolgaltatas"
              value={szolgaltatas}
              onChange={(e) => setSzolgaltatas(e.target.value)}
              required
            />
          )}
        </Field>
        <Field
          label="Port"
          htmlFor="port"
          required
          hint={
            valasztott?.portok.length
              ? `A konténer portjai: ${valasztott.portok.join(", ")}`
              : "A konténeren belüli port (pl. 3000)."
          }
        >
          <Input id="port" name="port" type="number" min={1} max={65535} required />
        </Field>
        <Field label="Séma" htmlFor="sema">
          <select id="sema" name="sema" className={SELECT_CLASS} defaultValue="http">
            <option value="http">http</option>
            <option value="https">https</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="websocket" defaultChecked className="size-4" />{" "}
          Websocket engedélyezése
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sslKikenyszer" defaultChecked className="size-4" />{" "}
          HTTP átirányítása HTTPS-re
        </label>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <h2 className="text-sm font-semibold sm:col-span-2">DNS (Cloudflare)</h2>
        <Field label="Rekord típusa" htmlFor="dnsTipus">
          <select
            id="dnsTipus"
            name="dnsTipus"
            className={SELECT_CLASS}
            defaultValue={dnsAlap?.tipus ?? "A"}
          >
            {DNS_TIPUSOK.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field
          label="Rekord célja"
          htmlFor="dnsCel"
          hint={
            dnsAlap
              ? "Előtöltve a legtöbb meglévő oldal beállításával."
              : "A nyilvános IP (A) vagy a cél hostnév (CNAME)."
          }
        >
          <Input id="dnsCel" name="dnsCel" defaultValue={dnsAlap?.cel ?? ""} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="dnsProxied"
            defaultChecked={dnsAlap?.proxied ?? true}
            className="size-4"
          />{" "}
          Cloudflare proxy (narancs felhő)
        </label>
        <Field
          label="Let's Encrypt e-mail"
          htmlFor="email"
          hint="Csak új tanúsítványnál kell, ha még nincs egy sem. Az SSL DNS-01 kihívással készül, a meglévő lefedő tanúsítvány újrahasznosul."
        >
          <Input id="email" name="email" type="email" />
        </Field>
      </section>

      <Field label="Megjegyzés" htmlFor="megjegyzes">
        <Input id="megjegyzes" name="megjegyzes" maxLength={500} />
      </Field>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Button type="submit" loading={pending}>
            Oldal közzététele (DNS + SSL + proxy)
          </Button>
          <Button asChild variant="ghost">
            <Link href="/infra/oldalak">Mégse</Link>
          </Button>
        </div>
        {eredmeny && (
          <div className="rounded-md border p-3">
            <LepesLista lepesek={eredmeny.lepesek} />
            {eredmeny.success && eredmeny.id ? (
              <Button asChild size="sm" className="mt-3">
                <Link href={`/infra/oldalak/${eredmeny.id}`}>Az oldal megnyitása</Link>
              </Button>
            ) : (
              eredmeny.message && (
                <p className="text-destructive mt-2 text-sm">
                  {eredmeny.message} — a javítás után újra elküldheted, a már kész lépések
                  nem ismétlődnek hibásan.
                </p>
              )
            )}
          </div>
        )}
      </div>
    </form>
  );
}
