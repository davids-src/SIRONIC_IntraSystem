/**
 * Sites (Oldal): hostname(s) → one service of a stack. Creating a site is an idempotent
 * three-step "ensure" — Cloudflare DNS → Let's Encrypt certificate (DNS-01, reused when an
 * existing one already covers the names) → NPM proxy host — so a failed run is simply re-run.
 * No permission checks here.
 */
import { connectDB } from "@erp/db-core";
import { TANUSITVANY_FIGYELMEZTETES_NAP, type OldalSema } from "./constants";
import { InfraOldal, InfraStack, type IInfraOldal } from "./models";
import { kliensek } from "./kontextus";
import { szuksegesKliens, type InfraKliensek } from "./kliensek";
import { naplo } from "./esemeny";
import {
  InfraHiba,
  duplikalt,
  elsoHiba,
  hiba,
  hibaSzoveg,
  iso,
  ok,
  validId,
  type InfraResult,
  type Szereplo,
} from "./shared";
import {
  hostnevHibas,
  lejaratNapok,
  normalizeHost,
  tanusitvanyLefedi,
  tanusitvanyValaszt,
  zonaKeres,
} from "./szabalyok";
import {
  eloBetolt,
  csoportosit,
  konteinerStackId,
  toKonteiner,
  type PartnerNevek,
} from "./stack-api";
import { oldalSchema, type OldalInput } from "./validation";
import type {
  EllenorzesTetel,
  LepesEredmeny,
  OldalSor,
  SzinkronEredmeny,
} from "./tipusok";

export type OldalEredmeny = {
  ok: boolean;
  message?: string;
  id?: string;
  lepesek: LepesEredmeny[];
};

function toSor(
  o: IInfraOldal,
  stackNevek: Map<string, string>,
  partnerNevek?: PartnerNevek,
): OldalSor {
  return {
    id: String(o._id),
    nev: o.nev,
    hostnevek: o.hostnevek,
    stackId: o.stackId,
    stackNev: o.stackId ? stackNevek.get(o.stackId) : undefined,
    szolgaltatas: o.szolgaltatas,
    port: o.port,
    sema: o.sema,
    websocket: o.websocket,
    sslKikenyszer: o.sslKikenyszer,
    partnerId: o.partnerId,
    partnerNev: o.partnerId ? partnerNevek?.get(o.partnerId) : undefined,
    megjegyzes: o.megjegyzes,
    dns: { tipus: o.dns?.tipus, cel: o.dns?.cel, proxied: o.dns?.proxied ?? false },
    kulsoIdk: {
      npmProxyHostId: o.kulsoIdk?.npmProxyHostId,
      npmTanusitvanyId: o.kulsoIdk?.npmTanusitvanyId,
      cloudflareZonaId: o.kulsoIdk?.cloudflareZonaId,
    },
  };
}

async function stackNevek(): Promise<Map<string, string>> {
  const rows = await InfraStack.find().select("nev").lean().exec();
  return new Map(rows.map((r) => [String(r._id), r.nev]));
}

async function oldalBetolt(id: string): Promise<IInfraOldal> {
  if (!validId(id)) throw new InfraHiba("Az oldal nem található.");
  await connectDB();
  const o = await InfraOldal.findById(id).exec();
  if (!o) throw new InfraHiba("Az oldal nem található.");
  return o;
}

// ------------------------------------------------------------------ the three steps

type Allapot = {
  hostok: string[];
  zonaId?: string | null;
  dnsIdk: string[];
  tanusitvanyId?: number | null;
  proxyHostId?: number | null;
};

async function dnsLepes(
  k: InfraKliensek,
  hostok: string[],
  dns: { tipus: "A" | "CNAME"; cel: string; proxied: boolean },
  all: Allapot,
): Promise<string> {
  const cf = szuksegesKliens(k, "cloudflare");
  const zonak = await cf.listZones();
  const idk: string[] = [];
  let zonaId: string | null = null;
  for (const h of hostok) {
    const z = zonaKeres(h, zonak);
    if (!z)
      throw new InfraHiba(
        `A(z) ${h} domainhez nincs Cloudflare zóna — add hozzá a domaint a Cloudflare-ben, és állítsd át a névszervereket.`,
      );
    if (h === hostok[0]) zonaId = z.id;
    const r = await cf.upsertDnsRecord(z.id, {
      type: dns.tipus,
      name: h,
      content: dns.cel,
      proxied: dns.proxied,
    });
    idk.push(r.id);
  }
  all.zonaId = zonaId;
  all.dnsIdk = idk;
  return `${hostok.length} DNS rekord rendben (${dns.tipus} → ${dns.cel}).`;
}

async function sslLepes(
  k: InfraKliensek,
  hostok: string[],
  email: string | undefined,
  all: Allapot,
): Promise<string> {
  const npm = szuksegesKliens(k, "npm");
  const certek = await npm.listCertificates();
  const meglevo = tanusitvanyValaszt(certek, hostok);
  if (meglevo) {
    all.tanusitvanyId = meglevo.id;
    return `Meglévő tanúsítvány használva (#${meglevo.id}).`;
  }
  if (!k.cloudflareToken)
    throw new InfraHiba("Az SSL-hez (DNS-01) Cloudflare integráció kell.");
  const cim =
    email ??
    k.letsencryptEmail ??
    (certek.find((c) => c.meta?.letsencrypt_email)?.meta?.letsencrypt_email as
      string | undefined) ??
    undefined;
  if (!cim)
    throw new InfraHiba(
      "Add meg a Let's Encrypt értesítési e-mail címet (nincs korábbi tanúsítvány, amiből átvehetném).",
    );
  const c = await npm.createCertificate({
    domainNames: hostok,
    dnsProviderCredentials: `dns_cloudflare_api_token = ${k.cloudflareToken}\n`,
    letsencryptEmail: cim,
  });
  all.tanusitvanyId = c.id;
  return `Új tanúsítvány kiállítva DNS-01 kihívással (#${c.id}).`;
}

async function proxyLepes(
  k: InfraKliensek,
  d: {
    hostok: string[];
    forwardHost: string;
    port: number;
    sema: OldalSema;
    websocket: boolean;
    sslKikenyszer: boolean;
    meglevoId?: number | null;
  },
  all: Allapot,
): Promise<string> {
  const npm = szuksegesKliens(k, "npm");
  if (!all.tanusitvanyId) throw new InfraHiba("Nincs tanúsítvány a proxy hosthoz.");
  const hosts = await npm.listProxyHosts();
  let id = d.meglevoId ?? null;
  if (id && !hosts.some((h) => h.id === id)) id = null;
  if (!id) {
    const utkozo = hosts.find((h) => h.domain_names.some((n) => d.hostok.includes(n)));
    if (utkozo) id = utkozo.id; // adopt a proxy host that already serves one of the names
  }
  if (id) {
    await npm.updateProxyHost(id, {
      domainNames: d.hostok,
      forwardScheme: d.sema,
      forwardHost: d.forwardHost,
      forwardPort: d.port,
      certificateId: all.tanusitvanyId,
      allowWebsocketUpgrade: d.websocket,
      sslForced: d.sslKikenyszer,
    });
    all.proxyHostId = id;
    return `NPM proxy host frissítve (#${id}).`;
  }
  const c = await npm.createProxyHost({
    domainNames: d.hostok,
    forwardScheme: d.sema,
    forwardHost: d.forwardHost,
    forwardPort: d.port,
    certificateId: all.tanusitvanyId,
    allowWebsocketUpgrade: d.websocket,
    sslForced: d.sslKikenyszer,
  });
  all.proxyHostId = c.id;
  return `NPM proxy host létrehozva (#${c.id}).`;
}

/** Resolves the NPM forward host: the real container name inside the stack. */
async function celKonteiner(
  k: InfraKliensek,
  stackId: string | undefined,
  szolgaltatas: string,
): Promise<string> {
  if (!stackId) return szolgaltatas; // external target (IP / hostname) — nothing to verify
  const stack = await InfraStack.findById(
    validId(stackId) ? stackId : "000000000000000000000000",
  ).exec();
  if (!stack) throw new InfraHiba("A kiválasztott stack nem található.");
  const p = szuksegesKliens(k, "portainer");
  const { stackenkent } = csoportosit(await eloBetolt(p));
  const lista = stackenkent.get(stack.portainerStackId) ?? [];
  const c = lista.find((x) => x.nev === szolgaltatas || x.szolgaltatas === szolgaltatas);
  if (!c)
    throw new InfraHiba(
      `A(z) „${szolgaltatas}” szolgáltatás nem található a(z) „${stack.nev}” stackben (konténerek: ${lista.map((x) => x.nev).join(", ") || "nincs"}).`,
    );
  return c.nev;
}

function defaultDns(
  o: OldalInput,
  legnepszerubb?: { tipus: "A" | "CNAME"; cel: string; proxied: boolean },
) {
  if (o.dns)
    return { tipus: o.dns.tipus, cel: o.dns.cel, proxied: o.dns.proxied ?? true };
  if (legnepszerubb) return legnepszerubb;
  throw new InfraHiba(
    "Add meg a DNS célt (A rekord IP-je vagy CNAME célja) — még nincs korábbi oldal, amiből átvehetném.",
  );
}

// ------------------------------------------------------------------ facade

export const oldalApi = {
  async listOldalak(
    szuro: { stackId?: string; partnerId?: string; kereses?: string } = {},
    opts: { partnerNevek?: PartnerNevek } = {},
  ): Promise<OldalSor[]> {
    await connectDB();
    const filter: Record<string, unknown> = {};
    if (szuro.stackId) filter.stackId = szuro.stackId;
    if (szuro.partnerId) filter.partnerId = szuro.partnerId;
    if (szuro.kereses?.trim()) {
      const q = szuro.kereses.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { hostnevek: { $regex: q, $options: "i" } },
        { nev: { $regex: q, $options: "i" } },
        { szolgaltatas: { $regex: q, $options: "i" } },
      ];
    }
    const [rows, nevek] = await Promise.all([
      InfraOldal.find(filter).sort({ nev: 1 }).exec(),
      stackNevek(),
    ]);
    return rows.map((o) => toSor(o, nevek, opts.partnerNevek));
  },

  async getOldal(
    id: string,
    opts: { partnerNevek?: PartnerNevek } = {},
  ): Promise<OldalSor | null> {
    if (!validId(id)) return null;
    await connectDB();
    const o = await InfraOldal.findById(id).exec();
    return o ? toSor(o, await stackNevek(), opts.partnerNevek) : null;
  },

  /** Resolves a reference — Mongo id or any hostname of the site — to the site id. */
  async oldalAzonosit(ref: string): Promise<string> {
    await connectDB();
    const kulcs = ref.trim();
    if (validId(kulcs)) {
      const r = await InfraOldal.findById(kulcs).select("_id").lean().exec();
      if (r) return String(r._id);
    }
    const r = await InfraOldal.findOne({ hostnevek: normalizeHost(kulcs) })
      .select("_id")
      .lean()
      .exec();
    if (r) return String(r._id);
    throw new InfraHiba(`Nincs „${kulcs}” oldal — futtass egy szinkront?`);
  },

  /** The DNS target most existing sites use — pre-fills the "new site" form. */
  async dnsAlapertelmezes(): Promise<{
    tipus: "A" | "CNAME";
    cel: string;
    proxied: boolean;
  } | null> {
    await connectDB();
    const rows = await InfraOldal.aggregate<{
      _id: { t: "A" | "CNAME"; c: string; p: boolean };
      n: number;
    }>([
      { $match: { "dns.cel": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: { t: "$dns.tipus", c: "$dns.cel", p: "$dns.proxied" },
          n: { $sum: 1 },
        },
      },
      { $sort: { n: -1 } },
      { $limit: 1 },
    ]);
    const r = rows[0];
    return r ? { tipus: r._id.t, cel: r._id.c, proxied: Boolean(r._id.p) } : null;
  },

  /** New site: DNS → SSL → proxy host. Safe to re-run after a failure. */
  async ujOldal(bemenet: OldalInput, szereplo: Szereplo): Promise<OldalEredmeny> {
    const lepesek: LepesEredmeny[] = [];
    const parsed = oldalSchema.safeParse(bemenet);
    if (!parsed.success)
      return { ok: false, message: elsoHiba(parsed.error.issues), lepesek };
    const p = parsed.data;
    const hostok = [...new Set(p.hostnevek.map(normalizeHost))];
    const celNev = p.nev?.trim() || hostok[0]!;
    try {
      for (const h of hostok) {
        const e = hostnevHibas(h);
        if (e) throw new InfraHiba(e);
      }
      await connectDB();
      const foglalt = await InfraOldal.findOne({ hostnevek: { $in: hostok } }).exec();
      if (foglalt)
        throw new InfraHiba(
          `A(z) ${foglalt.hostnevek.join(", ")} már oldalként létezik.`,
        );
      const k = await kliensek();
      const forward = await celKonteiner(k, p.stackId, p.szolgaltatas);
      const dns = defaultDns(p, (await oldalApi.dnsAlapertelmezes()) ?? undefined);
      const all: Allapot = { hostok, dnsIdk: [] };
      const run = async (kulcs: LepesEredmeny["kulcs"], fn: () => Promise<string>) => {
        try {
          lepesek.push({ kulcs, ok: true, uzenet: await fn() });
        } catch (err) {
          lepesek.push({ kulcs, ok: false, uzenet: hibaSzoveg(err) });
          throw err;
        }
      };
      await run("dns", () => dnsLepes(k, hostok, dns, all));
      await run("ssl", () => sslLepes(k, hostok, p.letsencryptEmail, all));
      await run("proxy", () =>
        proxyLepes(
          k,
          {
            hostok,
            forwardHost: forward,
            port: p.port,
            sema: p.sema ?? "http",
            websocket: p.websocket ?? true,
            sslKikenyszer: p.sslKikenyszer ?? true,
          },
          all,
        ),
      );
      const doc = await InfraOldal.create({
        nev: celNev,
        hostnevek: hostok,
        stackId: p.stackId,
        szolgaltatas: forward,
        port: p.port,
        sema: p.sema ?? "http",
        websocket: p.websocket ?? true,
        sslKikenyszer: p.sslKikenyszer ?? true,
        partnerId: p.partnerId,
        megjegyzes: p.megjegyzes,
        dns,
        kulsoIdk: {
          npmProxyHostId: all.proxyHostId,
          npmTanusitvanyId: all.tanusitvanyId,
          cloudflareZonaId: all.zonaId,
          cloudflareDnsRekordIdk: all.dnsIdk,
        },
        utolsoSzinkron: new Date(),
      });
      await naplo({
        muvelet: "oldal.letrehoz",
        celTipus: "oldal",
        celId: String(doc._id),
        celNev,
        ok: true,
        reszletek: { hostnevek: hostok, lepesek },
        szereplo,
      });
      return { ok: true, id: String(doc._id), lepesek };
    } catch (err) {
      const message = duplikalt(err)
        ? "Ez a hostnév már oldalként létezik."
        : hibaSzoveg(err);
      await naplo({
        muvelet: "oldal.letrehoz",
        celTipus: "oldal",
        celNev,
        ok: false,
        uzenet: message,
        reszletek: { hostnevek: hostok, lepesek },
        szereplo,
      });
      return { ok: false, message, lepesek };
    }
  },

  /**
   * Edit a site. Changing only the target (service/port/scheme/…) touches the proxy host alone;
   * changing the hostnames re-runs DNS + SSL too.
   */
  async modositOldal(
    id: string,
    patch: Partial<
      Pick<
        OldalInput,
        | "nev"
        | "hostnevek"
        | "stackId"
        | "szolgaltatas"
        | "port"
        | "sema"
        | "websocket"
        | "sslKikenyszer"
        | "partnerId"
        | "megjegyzes"
        | "dns"
        | "letsencryptEmail"
      >
    >,
    szereplo: Szereplo,
  ): Promise<OldalEredmeny> {
    const lepesek: LepesEredmeny[] = [];
    let celNev: string | undefined;
    try {
      const o = await oldalBetolt(id);
      celNev = o.nev;
      const hostok = patch.hostnevek
        ? [...new Set(patch.hostnevek.map(normalizeHost))]
        : o.hostnevek;
      for (const h of hostok) {
        const e = hostnevHibas(h);
        if (e) throw new InfraHiba(e);
      }
      const hostValtozott = hostok.join("|") !== o.hostnevek.join("|");
      const stackId =
        patch.stackId !== undefined ? patch.stackId || undefined : o.stackId;
      const szolg = patch.szolgaltatas ?? o.szolgaltatas;
      const celValtozott =
        patch.stackId !== undefined ||
        patch.szolgaltatas !== undefined ||
        (patch.port !== undefined && patch.port !== o.port) ||
        (patch.sema !== undefined && patch.sema !== o.sema) ||
        (patch.websocket !== undefined && patch.websocket !== o.websocket) ||
        (patch.sslKikenyszer !== undefined && patch.sslKikenyszer !== o.sslKikenyszer);
      const dnsValtozott = patch.dns !== undefined;

      if (hostValtozott) {
        const foglalt = await InfraOldal.findOne({
          hostnevek: { $in: hostok },
          _id: { $ne: o._id },
        }).exec();
        if (foglalt)
          throw new InfraHiba(
            `A(z) ${foglalt.hostnevek.join(", ")} már másik oldalhoz tartozik.`,
          );
      }
      if (hostValtozott || celValtozott || dnsValtozott) {
        const k = await kliensek();
        const forward =
          celValtozott || hostValtozott ? await celKonteiner(k, stackId, szolg) : szolg;
        const all: Allapot = {
          hostok,
          dnsIdk: o.kulsoIdk?.cloudflareDnsRekordIdk ?? [],
          zonaId: o.kulsoIdk?.cloudflareZonaId,
          tanusitvanyId: o.kulsoIdk?.npmTanusitvanyId,
          proxyHostId: o.kulsoIdk?.npmProxyHostId,
        };
        const run = async (kulcs: LepesEredmeny["kulcs"], fn: () => Promise<string>) => {
          try {
            lepesek.push({ kulcs, ok: true, uzenet: await fn() });
          } catch (err) {
            lepesek.push({ kulcs, ok: false, uzenet: hibaSzoveg(err) });
            throw err;
          }
        };
        const dns = patch.dns
          ? {
              tipus: patch.dns.tipus,
              cel: patch.dns.cel,
              proxied: patch.dns.proxied ?? true,
            }
          : o.dns?.tipus && o.dns.cel
            ? { tipus: o.dns.tipus, cel: o.dns.cel, proxied: o.dns.proxied }
            : null;
        if (hostValtozott || dnsValtozott) {
          if (!dns) throw new InfraHiba("Add meg a DNS célt.");
          await run("dns", () => dnsLepes(k, hostok, dns, all));
        }
        if (hostValtozott)
          await run("ssl", () => sslLepes(k, hostok, patch.letsencryptEmail, all));
        await run("proxy", () =>
          proxyLepes(
            k,
            {
              hostok,
              forwardHost: forward,
              port: patch.port ?? o.port,
              sema: patch.sema ?? o.sema,
              websocket: patch.websocket ?? o.websocket,
              sslKikenyszer: patch.sslKikenyszer ?? o.sslKikenyszer,
              meglevoId: all.proxyHostId,
            },
            all,
          ),
        );
        o.hostnevek = hostok;
        o.szolgaltatas = forward;
        o.stackId = stackId;
        if (dns) o.dns = dns;
        o.kulsoIdk = {
          npmProxyHostId: all.proxyHostId,
          npmTanusitvanyId: all.tanusitvanyId,
          cloudflareZonaId: all.zonaId,
          cloudflareDnsRekordIdk: all.dnsIdk,
        };
      }
      if (patch.port !== undefined) o.port = patch.port;
      if (patch.sema !== undefined) o.sema = patch.sema;
      if (patch.websocket !== undefined) o.websocket = patch.websocket;
      if (patch.sslKikenyszer !== undefined) o.sslKikenyszer = patch.sslKikenyszer;
      if (patch.nev !== undefined) o.nev = patch.nev.trim() || o.nev;
      if (patch.partnerId !== undefined) o.partnerId = patch.partnerId || undefined;
      if (patch.megjegyzes !== undefined) o.megjegyzes = patch.megjegyzes || undefined;
      await o.save();
      await naplo({
        muvelet: "oldal.modosit",
        celTipus: "oldal",
        celId: id,
        celNev: o.nev,
        ok: true,
        reszletek: { mezok: Object.keys(patch), lepesek },
        szereplo,
      });
      return { ok: true, id, lepesek };
    } catch (err) {
      const message = hibaSzoveg(err);
      await naplo({
        muvelet: "oldal.modosit",
        celTipus: "oldal",
        celId: id,
        celNev,
        ok: false,
        uzenet: message,
        szereplo,
      });
      return { ok: false, message, lepesek };
    }
  },

  /** Removes the NPM proxy host (and the DNS records when asked); the certificate is kept. */
  async torolOldal(
    id: string,
    opts: { dns?: boolean },
    szereplo: Szereplo,
  ): Promise<InfraResult> {
    let celNev: string | undefined;
    try {
      const o = await oldalBetolt(id);
      celNev = o.nev;
      const k = await kliensek();
      const reszek: string[] = [];
      if (o.kulsoIdk?.npmProxyHostId) {
        const npm = szuksegesKliens(k, "npm");
        try {
          await npm.deleteProxyHost(o.kulsoIdk.npmProxyHostId);
          reszek.push("proxy host törölve");
        } catch {
          reszek.push("a proxy host már nem létezett");
        }
      }
      if (opts.dns && o.kulsoIdk?.cloudflareZonaId) {
        const cf = szuksegesKliens(k, "cloudflare");
        for (const rid of o.kulsoIdk.cloudflareDnsRekordIdk ?? []) {
          await cf
            .deleteDnsRecord(o.kulsoIdk.cloudflareZonaId, rid)
            .catch(() => undefined);
        }
        reszek.push("DNS rekordok törölve");
      }
      await InfraOldal.deleteOne({ _id: o._id });
      await naplo({
        muvelet: "oldal.torles",
        celTipus: "oldal",
        celId: id,
        celNev,
        ok: true,
        reszletek: { reszek },
        szereplo,
      });
      return ok(id);
    } catch (err) {
      const message = hibaSzoveg(err);
      await naplo({
        muvelet: "oldal.torles",
        celTipus: "oldal",
        celId: id,
        celNev,
        ok: false,
        uzenet: message,
        szereplo,
      });
      return hiba(message);
    }
  },

  /** Renews the certificate; if the site has none (or it no longer covers the names) issues one. */
  async sslMegujit(
    id: string,
    szereplo: Szereplo,
  ): Promise<InfraResult<{ uzenet: string }>> {
    let celNev: string | undefined;
    try {
      const o = await oldalBetolt(id);
      celNev = o.nev;
      const k = await kliensek();
      const npm = szuksegesKliens(k, "npm");
      const certek = await npm.listCertificates();
      const mostani = certek.find((c) => c.id === o.kulsoIdk?.npmTanusitvanyId);
      let uzenet: string;
      if (mostani && tanusitvanyLefedi({ ...mostani, expires_on: null }, o.hostnevek)) {
        await npm.renewCertificate(mostani.id);
        uzenet = `A tanúsítvány (#${mostani.id}) megújítása lefutott.`;
      } else {
        const all: Allapot = { hostok: o.hostnevek, dnsIdk: [] };
        uzenet = await sslLepes(k, o.hostnevek, undefined, all);
        if (all.tanusitvanyId && o.kulsoIdk?.npmProxyHostId) {
          await npm.updateProxyHost(o.kulsoIdk.npmProxyHostId, {
            certificateId: all.tanusitvanyId,
          });
          o.kulsoIdk = {
            ...o.kulsoIdk,
            npmTanusitvanyId: all.tanusitvanyId,
            cloudflareDnsRekordIdk: o.kulsoIdk.cloudflareDnsRekordIdk ?? [],
          };
          await o.save();
        }
      }
      await naplo({
        muvelet: "oldal.ssl",
        celTipus: "oldal",
        celId: id,
        celNev,
        ok: true,
        uzenet,
        szereplo,
      });
      return ok(id, { uzenet });
    } catch (err) {
      const message = hibaSzoveg(err);
      await naplo({
        muvelet: "oldal.ssl",
        celTipus: "oldal",
        celId: id,
        celNev,
        ok: false,
        uzenet: message,
        szereplo,
      });
      return hiba(message);
    }
  },

  /** Read-only health check of one site: DNS, SSL, proxy, container, live HTTPS probe. */
  async ellenorizOldal(
    id: string,
    opts: { elerhetoseg?: boolean } = {},
  ): Promise<EllenorzesTetel[]> {
    const o = await oldalBetolt(id);
    const k = await kliensek();
    const out: EllenorzesTetel[] = [];
    const tedd = (t: EllenorzesTetel) => out.push(t);

    // DNS
    try {
      const cf = szuksegesKliens(k, "cloudflare");
      const zonak = await cf.listZones();
      const hianyzo: string[] = [];
      const cache = new Map<string, Awaited<ReturnType<typeof cf.listDnsRecords>>>();
      for (const h of o.hostnevek) {
        const z = zonaKeres(h, zonak);
        if (!z) {
          hianyzo.push(`${h} (nincs zóna)`);
          continue;
        }
        if (!cache.has(z.id)) cache.set(z.id, await cf.listDnsRecords(z.id));
        const van = cache
          .get(z.id)!
          .some((r) => r.name === h && ["A", "AAAA", "CNAME"].includes(r.type));
        if (!van) hianyzo.push(h);
      }
      tedd(
        hianyzo.length
          ? {
              kulcs: "dns",
              szint: "hiba",
              uzenet: `Hiányzó DNS rekord: ${hianyzo.join(", ")}.`,
            }
          : { kulcs: "dns", szint: "ok", uzenet: "Minden hostnévhez van DNS rekord." },
      );
    } catch (err) {
      tedd({
        kulcs: "dns",
        szint: "figyelmeztetes",
        uzenet: `Nem ellenőrizhető: ${hibaSzoveg(err)}`,
      });
    }

    // Proxy + SSL
    try {
      const npm = szuksegesKliens(k, "npm");
      const [hosts, certek] = await Promise.all([
        npm.listProxyHosts(),
        npm.listCertificates(),
      ]);
      const host =
        hosts.find((h) => h.id === o.kulsoIdk?.npmProxyHostId) ??
        hosts.find((h) => h.domain_names.some((n) => o.hostnevek.includes(n)));
      if (!host) {
        tedd({
          kulcs: "proxy",
          szint: "hiba",
          uzenet: "Nincs NPM proxy host ehhez az oldalhoz.",
        });
        tedd({
          kulcs: "ssl",
          szint: "hiba",
          uzenet: "Nincs proxy host, így nincs SSL sem.",
        });
      } else {
        const rossz =
          host.enabled === false
            ? "A proxy host le van tiltva."
            : host.forward_host !== o.szolgaltatas || host.forward_port !== o.port
              ? `Az NPM ${host.forward_host}:${host.forward_port} felé mutat, a nyilvántartás szerint ${o.szolgaltatas}:${o.port} kellene (szinkron szükséges?).`
              : null;
        tedd(
          rossz
            ? {
                kulcs: "proxy",
                szint: host.enabled === false ? "hiba" : "figyelmeztetes",
                uzenet: rossz,
              }
            : {
                kulcs: "proxy",
                szint: "ok",
                uzenet: `Proxy host aktív → ${host.forward_host}:${host.forward_port}.`,
              },
        );
        const cid = Number(host.certificate_id ?? 0);
        const cert = certek.find((c) => c.id === cid);
        if (!cert)
          tedd({
            kulcs: "ssl",
            szint: "hiba",
            uzenet: "A proxy hosthoz nincs tanúsítvány rendelve.",
          });
        else {
          const nap = lejaratNapok(cert.expires_on);
          const lefed = tanusitvanyLefedi({ ...cert, expires_on: null }, o.hostnevek);
          if (!lefed)
            tedd({
              kulcs: "ssl",
              szint: "hiba",
              uzenet: "A tanúsítvány nem fedi le az összes hostnevet.",
            });
          else if (nap !== null && nap < 0)
            tedd({ kulcs: "ssl", szint: "hiba", uzenet: "A tanúsítvány lejárt." });
          else if (nap !== null && nap <= TANUSITVANY_FIGYELMEZTETES_NAP)
            tedd({
              kulcs: "ssl",
              szint: "figyelmeztetes",
              uzenet: `A tanúsítvány ${nap} nap múlva lejár.`,
            });
          else
            tedd({
              kulcs: "ssl",
              szint: "ok",
              uzenet:
                nap !== null
                  ? `Érvényes tanúsítvány (${nap} nap).`
                  : "Tanúsítvány rendben.",
            });
        }
      }
    } catch (err) {
      tedd({
        kulcs: "proxy",
        szint: "figyelmeztetes",
        uzenet: `Nem ellenőrizhető: ${hibaSzoveg(err)}`,
      });
    }

    // Container
    if (o.stackId) {
      try {
        const p = szuksegesKliens(k, "portainer");
        const elo = await eloBetolt(p);
        const c = elo.konteinerek.map(toKonteiner).find((x) => x.nev === o.szolgaltatas);
        tedd(
          !c
            ? {
                kulcs: "konteiner",
                szint: "hiba",
                uzenet: `A(z) ${o.szolgaltatas} konténer nem létezik.`,
              }
            : c.allapot !== "running"
              ? {
                  kulcs: "konteiner",
                  szint: "hiba",
                  uzenet: `A(z) ${c.nev} konténer nem fut (${c.allapot}).`,
                }
              : {
                  kulcs: "konteiner",
                  szint: "ok",
                  uzenet: `A(z) ${c.nev} konténer fut.`,
                },
        );
      } catch (err) {
        tedd({
          kulcs: "konteiner",
          szint: "figyelmeztetes",
          uzenet: `Nem ellenőrizhető: ${hibaSzoveg(err)}`,
        });
      }
    }

    // Live probe
    if (opts.elerhetoseg !== false) {
      const host = o.hostnevek[0]!;
      try {
        const res = await fetch(`https://${host}/`, {
          method: "GET",
          redirect: "manual",
          signal: AbortSignal.timeout(8000),
        });
        tedd(
          res.status >= 500
            ? {
                kulcs: "elerheto",
                szint: "hiba",
                uzenet: `https://${host} → HTTP ${res.status}.`,
              }
            : {
                kulcs: "elerheto",
                szint: "ok",
                uzenet: `https://${host} → HTTP ${res.status}.`,
              },
        );
      } catch {
        tedd({
          kulcs: "elerheto",
          szint: "hiba",
          uzenet: `https://${host} nem érhető el.`,
        });
      }
    }
    await naplo({
      muvelet: "oldal.ellenorzes",
      celTipus: "oldal",
      celId: id,
      celNev: o.nev,
      ok: out.every((t) => t.szint !== "hiba"),
      szereplo: "rendszer",
    });
    return out;
  },
};

// ------------------------------------------------------------------ sync (sites)

/**
 * Mirrors the NPM proxy hosts into sites, linking each to its stack via the container name and to
 * its Cloudflare zone/records via the hostname. Existing user data (partner, notes, name) is kept.
 */
export async function oldalSzinkron(
  k: InfraKliensek,
): Promise<SzinkronEredmeny["oldalak"] & { figyelmeztetesek: string[] }> {
  await connectDB();
  const npm = szuksegesKliens(k, "npm");
  const [hosts, certek] = await Promise.all([
    npm.listProxyHosts(),
    npm.listCertificates(),
  ]);
  const certIdk = new Set(certek.map((c) => c.id));
  const figyelmeztetesek: string[] = [];

  // container name -> stack row id
  const nevAlapjan = new Map<string, string>();
  if (k.portainer) {
    const elo = await eloBetolt(k.portainer);
    const sorok = await InfraStack.find().exec();
    for (const c of elo.konteinerek) {
      const sid = konteinerStackId(c, elo.stackek);
      const sor = sid === null ? null : sorok.find((r) => r.portainerStackId === sid);
      const nev = (c.Names[0] ?? "").replace(/^\//, "");
      if (sor && nev) nevAlapjan.set(nev, String(sor._id));
    }
  } else
    figyelmeztetesek.push(
      "Nincs Portainer integráció — az oldalak nem kapcsolhatók stackhez.",
    );

  // Cloudflare lookups (best effort)
  let zonak: Array<{ id: string; name: string }> = [];
  const rekordok = new Map<
    string,
    Array<{ id: string; type: string; name: string; content: string; proxied?: boolean }>
  >();
  if (k.cloudflare) {
    try {
      zonak = await k.cloudflare.listZones();
    } catch {
      figyelmeztetesek.push(
        "A Cloudflare zónák nem olvashatók — a DNS adatok kimaradtak.",
      );
    }
  } else figyelmeztetesek.push("Nincs Cloudflare integráció — a DNS adatok kimaradtak.");

  const zonaRekordok = async (zid: string) => {
    if (!rekordok.has(zid)) {
      rekordok.set(
        zid,
        k.cloudflare ? await k.cloudflare.listDnsRecords(zid).catch(() => []) : [],
      );
    }
    return rekordok.get(zid)!;
  };

  const meglevok = await InfraOldal.find().exec();
  let uj = 0;
  let frissitve = 0;
  const latott = new Set<string>();
  for (const h of hosts) {
    const nevek = h.domain_names.map(normalizeHost);
    let o =
      meglevok.find((x) => x.kulsoIdk?.npmProxyHostId === h.id) ??
      meglevok.find((x) => x.hostnevek.some((n) => nevek.includes(n)));
    const sema = (h.forward_scheme === "https" ? "https" : "http") as OldalSema;
    const certId = Number(h.certificate_id ?? 0);
    const stackId = nevAlapjan.get(h.forward_host);
    // DNS facts
    let zonaId: string | null = null;
    const dnsIdk: string[] = [];
    let dns: { tipus?: "A" | "CNAME"; cel?: string; proxied: boolean } = {
      proxied: false,
    };
    zonaId = zonaKeres(nevek[0]!, zonak)?.id ?? null;
    for (const n of nevek) {
      const zn = zonaKeres(n, zonak);
      if (!zn) continue;
      const r = (await zonaRekordok(zn.id)).find(
        (x) => x.name === n && (x.type === "A" || x.type === "CNAME"),
      );
      if (!r) continue;
      dnsIdk.push(r.id);
      if (n === nevek[0])
        dns = {
          tipus: r.type as "A" | "CNAME",
          cel: r.content,
          proxied: r.proxied ?? false,
        };
    }
    const kulso = {
      npmProxyHostId: h.id,
      npmTanusitvanyId: certIdk.has(certId) ? certId : null,
      cloudflareZonaId: zonaId,
      cloudflareDnsRekordIdk: dnsIdk,
    };
    if (o) {
      o.hostnevek = nevek;
      o.szolgaltatas = h.forward_host;
      o.port = h.forward_port;
      o.sema = sema;
      o.websocket = h.allow_websocket_upgrade ?? o.websocket;
      o.sslKikenyszer = h.ssl_forced ?? o.sslKikenyszer;
      if (stackId) o.stackId = stackId;
      if (dns.cel) o.dns = dns;
      o.kulsoIdk = kulso;
      o.utolsoSzinkron = new Date();
      await o.save();
      frissitve += 1;
    } else {
      o = await InfraOldal.create({
        nev: nevek[0],
        hostnevek: nevek,
        stackId,
        szolgaltatas: h.forward_host,
        port: h.forward_port,
        sema,
        websocket: h.allow_websocket_upgrade ?? true,
        sslKikenyszer: h.ssl_forced ?? false,
        dns,
        kulsoIdk: kulso,
        utolsoSzinkron: new Date(),
      });
      meglevok.push(o);
      uj += 1;
    }
    latott.add(String(o._id));
  }
  // sites whose proxy host vanished: keep the record, drop the dangling NPM link
  let elveszett = 0;
  for (const o of meglevok) {
    if (!latott.has(String(o._id)) && o.kulsoIdk?.npmProxyHostId) {
      o.kulsoIdk = {
        ...o.kulsoIdk,
        npmProxyHostId: null,
        cloudflareDnsRekordIdk: o.kulsoIdk.cloudflareDnsRekordIdk ?? [],
      };
      await o.save();
      elveszett += 1;
    }
  }
  return { osszes: hosts.length, uj, frissitve, elveszett, figyelmeztetesek };
}

export { iso };
