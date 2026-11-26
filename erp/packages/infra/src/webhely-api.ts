/**
 * Webhelyek: sites that do NOT run on our Portainer (WordPress, plain FTP web hosting, …). They are
 * tracked, assigned to a partner, and carry their logins (FTP/SFTP, WordPress admin, …) so nobody has
 * to dig the credentials out of old mails. Passwords are AES-256-GCM encrypted at rest, never in a
 * DTO; revealing one is a separate, audited call. No permission checks here.
 */
import net from "node:net";
import { connectDB } from "@erp/db-core";
import { decryptSecret, encryptSecret } from "@erp/lib/utils";
import { HOZZAFERES_PORTOK, type HozzaferesTipus } from "./constants";
import {
  InfraHozzaferes,
  InfraOldal,
  InfraWebhely,
  type IInfraHozzaferes,
  type IInfraWebhely,
} from "./models";
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
import { hostnevHibas, normalizeHost } from "./szabalyok";
import {
  hozzaferesSchema,
  webhelySchema,
  type HozzaferesInput,
  type WebhelyInput,
} from "./validation";
import type { HozzaferesSor, WebhelyDetail, WebhelySor } from "./tipusok";

type PartnerNevek = Map<string, string>;

const hSor = (d: IInfraHozzaferes): HozzaferesSor => ({
  id: String(d._id),
  webhelyId: d.webhelyId,
  tipus: d.tipus,
  cimke: d.cimke,
  host: d.host,
  port: d.port ?? undefined,
  felhasznalo: d.felhasznalo ?? undefined,
  vanJelszo: !!d.jelszoTitkositott,
  konyvtar: d.konyvtar ?? undefined,
  url: d.url ?? undefined,
  megjegyzes: d.megjegyzes ?? undefined,
});

const wSor = (d: IInfraWebhely, db: number, nevek?: PartnerNevek): WebhelySor => ({
  id: String(d._id),
  nev: d.nev,
  tipus: d.tipus,
  hostnevek: d.hostnevek,
  partnerId: d.partnerId ?? undefined,
  partnerNev: d.partnerId ? nevek?.get(d.partnerId) : undefined,
  tarhely: d.tarhely ?? undefined,
  lejarat: iso(d.lejarat),
  hozzaferesSzam: db,
  utolsoEllenorzes: d.utolsoEllenorzes
    ? {
        at: d.utolsoEllenorzes.at.toISOString(),
        ok: d.utolsoEllenorzes.ok,
        statusz: d.utolsoEllenorzes.statusz ?? undefined,
        wordpress: d.utolsoEllenorzes.wordpress ?? undefined,
        uzenet: d.utolsoEllenorzes.uzenet ?? undefined,
      }
    : undefined,
});

async function darabok(): Promise<Map<string, number>> {
  const rows = await InfraHozzaferes.aggregate<{ _id: string; n: number }>([
    { $group: { _id: "$webhelyId", n: { $sum: 1 } } },
  ]).exec();
  return new Map(rows.map((r) => [r._id, r.n]));
}

async function betolt(id: string): Promise<IInfraWebhely> {
  if (!validId(id)) throw new InfraHiba("A webhely nem található.");
  const d = await InfraWebhely.findById(id).exec();
  if (!d) throw new InfraHiba("A webhely nem található.");
  return d;
}

async function hostok(raw: string[], sajatId?: string): Promise<string[]> {
  const out = [...new Set(raw.map(normalizeHost))];
  for (const h of out) {
    const e = hostnevHibas(h);
    if (e) throw new InfraHiba(e);
  }
  if (await InfraOldal.exists({ hostnevek: { $in: out } }))
    throw new InfraHiba("Ez a hostnév már egy stackhez kötött oldalnál szerepel.");
  const mas = await InfraWebhely.findOne({
    hostnevek: { $in: out },
    ...(sajatId ? { _id: { $ne: sajatId } } : {}),
  })
    .select("nev")
    .exec();
  if (mas) throw new InfraHiba(`Ez a hostnév már a(z) „${mas.nev}” webhelynél szerepel.`);
  return out;
}

function tcpProba(
  host: string,
  port: number,
  ms = 6000,
): Promise<{ ok: boolean; uzenet: string }> {
  return new Promise((resolve) => {
    const s = net.connect({ host, port });
    const veg = (okk: boolean, uzenet: string) => {
      s.destroy();
      resolve({ ok: okk, uzenet });
    };
    s.setTimeout(ms, () => veg(false, "Időtúllépés."));
    s.once("connect", () => veg(true, "A port elérhető."));
    s.once("error", (e) =>
      veg(false, `Nem elérhető (${(e as NodeJS.ErrnoException).code ?? "hiba"}).`),
    );
  });
}

export const webhelyApi = {
  async listWebhelyek(
    opts: { partnerNevek?: PartnerNevek; partnerId?: string } = {},
  ): Promise<WebhelySor[]> {
    await connectDB();
    const [rows, db] = await Promise.all([
      InfraWebhely.find(opts.partnerId ? { partnerId: opts.partnerId } : {})
        .sort({ nev: 1 })
        .exec(),
      darabok(),
    ]);
    return rows.map((r) => wSor(r, db.get(String(r._id)) ?? 0, opts.partnerNevek));
  },

  async getWebhely(
    id: string,
    opts: { partnerNevek?: PartnerNevek } = {},
  ): Promise<WebhelyDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await InfraWebhely.findById(id).exec();
    if (!d) return null;
    const h = await InfraHozzaferes.find({ webhelyId: id }).sort({ cimke: 1 }).exec();
    return {
      ...wSor(d, h.length, opts.partnerNevek),
      megjegyzes: d.megjegyzes ?? undefined,
      hozzaferesek: h.map(hSor),
    };
  },

  async webhelyAzonosit(ref: string): Promise<string> {
    await connectDB();
    if (validId(ref) && (await InfraWebhely.exists({ _id: ref }))) return ref;
    const d = await InfraWebhely.findOne({
      $or: [{ hostnevek: normalizeHost(ref) }, { nev: ref.trim() }],
    })
      .select("_id")
      .exec();
    if (!d) throw new InfraHiba(`Nincs ilyen webhely: ${ref}`);
    return String(d._id);
  },

  async ujWebhely(input: WebhelyInput, szereplo: Szereplo): Promise<InfraResult> {
    try {
      const p = webhelySchema.safeParse(input);
      if (!p.success) throw new InfraHiba(elsoHiba(p.error.issues));
      await connectDB();
      const hn = await hostok(p.data.hostnevek);
      const d = await InfraWebhely.create({
        ...p.data,
        hostnevek: hn,
        lejarat: p.data.lejarat ? new Date(p.data.lejarat) : undefined,
      });
      await naplo({
        muvelet: "webhely.letrehoz",
        celTipus: "webhely",
        celId: String(d._id),
        celNev: d.nev,
        ok: true,
        szereplo,
      });
      return ok(String(d._id));
    } catch (err) {
      if (duplikalt(err)) return hiba("Ez a hostnév már foglalt.");
      return hiba(hibaSzoveg(err));
    }
  },

  async modositWebhely(
    id: string,
    input: WebhelyInput,
    szereplo: Szereplo,
  ): Promise<InfraResult> {
    try {
      const p = webhelySchema.safeParse(input);
      if (!p.success) throw new InfraHiba(elsoHiba(p.error.issues));
      await connectDB();
      const d = await betolt(id);
      d.nev = p.data.nev;
      d.tipus = p.data.tipus ?? d.tipus;
      d.hostnevek = await hostok(p.data.hostnevek, id);
      d.partnerId = p.data.partnerId;
      d.tarhely = p.data.tarhely;
      d.lejarat = p.data.lejarat ? new Date(p.data.lejarat) : undefined;
      d.megjegyzes = p.data.megjegyzes;
      await d.save();
      await naplo({
        muvelet: "webhely.modosit",
        celTipus: "webhely",
        celId: id,
        celNev: d.nev,
        ok: true,
        szereplo,
      });
      return ok(id);
    } catch (err) {
      if (duplikalt(err)) return hiba("Ez a hostnév már foglalt.");
      return hiba(hibaSzoveg(err));
    }
  },

  /** Deletes the site and every login stored for it. */
  async torolWebhely(id: string, szereplo: Szereplo): Promise<InfraResult> {
    try {
      await connectDB();
      const d = await betolt(id);
      const db = (await InfraHozzaferes.deleteMany({ webhelyId: id }).exec())
        .deletedCount;
      await d.deleteOne();
      await naplo({
        muvelet: "webhely.torles",
        celTipus: "webhely",
        celId: id,
        celNev: d.nev,
        ok: true,
        reszletek: { torolthozzaferesek: db },
        szereplo,
      });
      return ok(id);
    } catch (err) {
      return hiba(hibaSzoveg(err));
    }
  },

  /** Read-only liveness probe: HTTPS status, and whether /wp-json answers like WordPress. */
  async ellenorizWebhely(id: string, szereplo: Szereplo) {
    try {
      await connectDB();
      const d = await betolt(id);
      const host = d.hostnevek[0]!;
      let statusz: number | undefined;
      let wordpress: boolean | undefined;
      let uzenet: string;
      let okk = false;
      try {
        const r = await fetch(`https://${host}/`, {
          redirect: "follow",
          signal: AbortSignal.timeout(10_000),
        });
        statusz = r.status;
        okk = r.status < 400;
        uzenet = okk ? `Elérhető (HTTP ${r.status}).` : `HTTP ${r.status}.`;
        if (okk) {
          try {
            const w = await fetch(`https://${host}/wp-json/`, {
              signal: AbortSignal.timeout(8_000),
            });
            const j = w.ok ? ((await w.json()) as { namespaces?: unknown }) : null;
            wordpress = Array.isArray(j?.namespaces);
          } catch {
            wordpress = false;
          }
        }
      } catch (err) {
        const kod = (err as { cause?: { code?: string } }).cause?.code;
        uzenet = kod === "CERT_HAS_EXPIRED" ? "Lejárt SSL tanúsítvány." : "Nem elérhető.";
      }
      d.utolsoEllenorzes = { at: new Date(), ok: okk, statusz, wordpress, uzenet };
      await d.save();
      await naplo({
        muvelet: "webhely.ellenorzes",
        celTipus: "webhely",
        celId: id,
        celNev: d.nev,
        ok: okk,
        uzenet,
        szereplo,
      });
      return ok(id, { uzenet, statusz, wordpress });
    } catch (err) {
      return hiba(hibaSzoveg(err));
    }
  },

  // ---------------------------------------------------------------- hozzáférések

  async ujHozzaferes(
    webhelyId: string,
    input: HozzaferesInput,
    szereplo: Szereplo,
  ): Promise<InfraResult> {
    try {
      const p = hozzaferesSchema.safeParse(input);
      if (!p.success) throw new InfraHiba(elsoHiba(p.error.issues));
      await connectDB();
      const w = await betolt(webhelyId);
      const tipus: HozzaferesTipus = p.data.tipus ?? "ftp";
      const d = await InfraHozzaferes.create({
        webhelyId,
        tipus,
        cimke: p.data.cimke,
        host: p.data.host,
        port: p.data.port ?? (HOZZAFERES_PORTOK[tipus] || undefined),
        felhasznalo: p.data.felhasznalo,
        jelszoTitkositott: p.data.jelszo ? encryptSecret(p.data.jelszo) : undefined,
        konyvtar: p.data.konyvtar,
        url: p.data.url,
        megjegyzes: p.data.megjegyzes,
      });
      await naplo({
        muvelet: "hozzaferes.letrehoz",
        celTipus: "webhely",
        celId: webhelyId,
        celNev: `${w.nev} — ${d.cimke}`,
        ok: true,
        szereplo,
      });
      return ok(String(d._id));
    } catch (err) {
      return hiba(hibaSzoveg(err));
    }
  },

  /** A blank/omitted `jelszo` keeps the stored password. */
  async modositHozzaferes(
    id: string,
    input: HozzaferesInput,
    szereplo: Szereplo,
  ): Promise<InfraResult> {
    try {
      const p = hozzaferesSchema.safeParse(input);
      if (!p.success) throw new InfraHiba(elsoHiba(p.error.issues));
      await connectDB();
      if (!validId(id)) throw new InfraHiba("A hozzáférés nem található.");
      const d = await InfraHozzaferes.findById(id).exec();
      if (!d) throw new InfraHiba("A hozzáférés nem található.");
      d.tipus = p.data.tipus ?? d.tipus;
      d.cimke = p.data.cimke;
      d.host = p.data.host;
      d.port = p.data.port;
      d.felhasznalo = p.data.felhasznalo;
      d.konyvtar = p.data.konyvtar;
      d.url = p.data.url;
      d.megjegyzes = p.data.megjegyzes;
      if (p.data.jelszo) d.jelszoTitkositott = encryptSecret(p.data.jelszo);
      await d.save();
      await naplo({
        muvelet: "hozzaferes.modosit",
        celTipus: "webhely",
        celId: d.webhelyId,
        celNev: d.cimke,
        ok: true,
        reszletek: { jelszoCserelve: !!p.data.jelszo },
        szereplo,
      });
      return ok(id);
    } catch (err) {
      return hiba(hibaSzoveg(err));
    }
  },

  async torolHozzaferes(id: string, szereplo: Szereplo): Promise<InfraResult> {
    try {
      await connectDB();
      if (!validId(id)) throw new InfraHiba("A hozzáférés nem található.");
      const d = await InfraHozzaferes.findByIdAndDelete(id).exec();
      if (!d) throw new InfraHiba("A hozzáférés nem található.");
      await naplo({
        muvelet: "hozzaferes.torles",
        celTipus: "webhely",
        celId: d.webhelyId,
        celNev: d.cimke,
        ok: true,
        szereplo,
      });
      return ok(id);
    } catch (err) {
      return hiba(hibaSzoveg(err));
    }
  },

  /** The ONLY way to read a stored password. Audited (who, when, which access — never the value). */
  async hozzaferesJelszo(
    id: string,
    szereplo: Szereplo,
  ): Promise<InfraResult<{ jelszo: string }>> {
    try {
      await connectDB();
      if (!validId(id)) throw new InfraHiba("A hozzáférés nem található.");
      const d = await InfraHozzaferes.findById(id).exec();
      if (!d?.jelszoTitkositott)
        throw new InfraHiba("Ehhez a hozzáféréshez nincs jelszó mentve.");
      const jelszo = decryptSecret(d.jelszoTitkositott);
      await naplo({
        muvelet: "hozzaferes.megtekintes",
        celTipus: "webhely",
        celId: d.webhelyId,
        celNev: d.cimke,
        ok: true,
        szereplo,
      });
      return ok(id, { jelszo });
    } catch (err) {
      return hiba(hibaSzoveg(err));
    }
  },

  /** TCP reachability of the access' host:port (does not log in). */
  async hozzaferesProba(id: string): Promise<{ ok: boolean; uzenet: string }> {
    await connectDB();
    const d = validId(id) ? await InfraHozzaferes.findById(id).exec() : null;
    if (!d) return { ok: false, uzenet: "A hozzáférés nem található." };
    const port = d.port ?? HOZZAFERES_PORTOK[d.tipus];
    if (!port) return { ok: false, uzenet: "Nincs megadva port." };
    return tcpProba(d.host, port);
  },
};
