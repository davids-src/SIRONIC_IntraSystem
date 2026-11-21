/**
 * Integration connections, stack templates and partner-portal access.
 *
 * Credentials are encrypted with the shared AES-256-GCM helper (`@erp/lib`, same key as the
 * Titoktár) before they touch the database and are NEVER returned: list/get expose only the
 * names of the stored fields. Plaintext exists only inside `kliensek.ts` while a client is built.
 */
import { connectDB } from "@erp/db-core";
import { buildDataTableMongoQuery, type DataTableQuery } from "@erp/ui";
import { decryptSecret, encryptSecret } from "@erp/lib/utils";
import {
  INTEGRACIO_HITELESITO_MEZOK,
  type IntegracioSzolgaltato,
  type Nezo,
} from "./constants";
import {
  INTEGRACIO_LIST_COLUMNS,
  SABLON_LIST_COLUMNS,
  type IntegracioListItem,
  type SablonListItem,
} from "./columns";
import {
  IntegracioKapcsolat,
  PartnerTelepitesHozzaferes,
  StackSablon,
  type HozzaferesSzint,
  type IIntegracioKapcsolat,
  type IStackSablon,
} from "./models/egyeb";
import { Telepites } from "./models/Telepites";
import { alapKliensGyar, egeszsegEllenorzes, kapcsolatAdat, type KliensGyar } from "./kliensek";
import { isPortal } from "./nezo";
import { renderSablon, sablonHelyorzok, type SablonHelyorzo } from "./sablon";
import {
  duplikalt,
  elsoHiba,
  hiba,
  iso,
  ok,
  oid,
  validId,
  type DeploymentsResult,
} from "./shared";
import {
  hozzaferesSchema,
  integracioSchema,
  sablonSchema,
  type IntegracioInput,
  type SablonInput,
} from "./validation";

// ----------------------------------------------------------------- IntegracioKapcsolat

export type IntegracioDetail = IntegracioListItem & {
  id: string;
  allowInsecureTls: boolean;
  accountId?: string;
  endpointId?: number;
};

function hitelesitoMezok(row: Pick<IIntegracioKapcsolat, "hitelesitoTitkositott">): string[] {
  try {
    return Object.entries(
      JSON.parse(decryptSecret(row.hitelesitoTitkositott)) as Record<string, string>,
    )
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
  } catch {
    return []; // wrong key / corrupt payload — list still works, nothing is revealed
  }
}

/** The one place a row becomes a DTO: field names only, never the payload or the values. */
function toIntegracio(r: IIntegracioKapcsolat): IntegracioDetail {
  return {
    _id: String(r._id),
    id: String(r._id),
    szolgaltato: r.szolgaltato,
    cimke: r.cimke,
    alapUrl: r.alapUrl,
    aktiv: r.aktiv,
    hitelesitoMezok: hitelesitoMezok(r),
    utolsoEllenorzes: iso(r.utolsoEllenorzes),
    utolsoEllenorzesOk: r.utolsoEllenorzesOk,
    utolsoEllenorzesUzenet: r.utolsoEllenorzesUzenet,
    allowInsecureTls: r.meta?.allow_insecure_tls === true,
    accountId: r.meta?.account_id as string | undefined,
    endpointId: r.meta?.endpoint_id as number | undefined,
  };
}

function metaOf(i: Pick<IntegracioInput, "allowInsecureTls" | "accountId" | "endpointId">) {
  const meta: Record<string, unknown> = {};
  if (i.allowInsecureTls) meta.allow_insecure_tls = true;
  if (i.accountId) meta.account_id = i.accountId;
  if (i.endpointId !== undefined) meta.endpoint_id = i.endpointId;
  return meta;
}

export const integracioApi = {
  async listIntegraciok(
    query: DataTableQuery,
  ): Promise<{ data: IntegracioListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      INTEGRACIO_LIST_COLUMNS,
    );
    const [rows, total] = await Promise.all([
      IntegracioKapcsolat.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      IntegracioKapcsolat.countDocuments(filter).exec(),
    ]);
    return { data: rows.map(toIntegracio), total };
  },

  async getIntegracio(id: string): Promise<IntegracioDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const r = await IntegracioKapcsolat.findById(id).exec();
    return r ? toIntegracio(r) : null;
  },

  async createIntegracio(
    input: IntegracioInput,
    actorId: string,
  ): Promise<DeploymentsResult> {
    const p = integracioSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    const hianyzo = INTEGRACIO_HITELESITO_MEZOK[p.data.szolgaltato].filter(
      (m) => !p.data.hitelesito[m],
    );
    if (hianyzo.length > 0) return hiba(`Hiányzó hitelesítő mező: ${hianyzo.join(", ")}.`);
    await connectDB();
    try {
      const doc = await IntegracioKapcsolat.create({
        szolgaltato: p.data.szolgaltato,
        cimke: p.data.cimke,
        alapUrl: p.data.alapUrl,
        hitelesitoTitkositott: encryptSecret(JSON.stringify(p.data.hitelesito)),
        meta: metaOf(p.data),
        aktiv: p.data.aktiv ?? true,
        letrehozoId: actorId,
      });
      return ok(String(doc._id));
    } catch (err) {
      if (duplikalt(err)) return hiba("Ilyen címkével már van kapcsolat ennél a szolgáltatónál.");
      throw err;
    }
  },

  /** Blank credential fields keep the stored value; filled ones replace it. */
  async updateIntegracio(id: string, input: IntegracioInput): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A kapcsolat nem található.");
    const p = integracioSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    const doc = await IntegracioKapcsolat.findById(id).exec();
    if (!doc) return hiba("A kapcsolat nem található.");
    const regi = JSON.parse(decryptSecret(doc.hitelesitoTitkositott)) as Record<string, string>;
    const uj: Record<string, string> = { ...regi };
    for (const [k, v] of Object.entries(p.data.hitelesito)) if (v) uj[k] = v;
    doc.cimke = p.data.cimke;
    doc.alapUrl = p.data.alapUrl;
    doc.hitelesitoTitkositott = encryptSecret(JSON.stringify(uj));
    doc.meta = metaOf(p.data);
    doc.aktiv = p.data.aktiv ?? doc.aktiv;
    try {
      await doc.save();
    } catch (err) {
      if (duplikalt(err)) return hiba("Ilyen címkével már van kapcsolat ennél a szolgáltatónál.");
      throw err;
    }
    return ok(id);
  },

  async deleteIntegracio(id: string): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A kapcsolat nem található.");
    await connectDB();
    const r = await IntegracioKapcsolat.deleteOne({ _id: oid(id) }).exec();
    return r.deletedCount === 0 ? hiba("A kapcsolat nem található.") : ok(id);
  },

  /** The "Teszt" button: decrypt, build the client, probe the provider, store the outcome. */
  async tesztIntegracio(
    id: string,
    gyar: KliensGyar = alapKliensGyar,
  ): Promise<DeploymentsResult<{ uzenet: string; sikeres: boolean }>> {
    if (!validId(id)) return hiba("A kapcsolat nem található.");
    await connectDB();
    const doc = await IntegracioKapcsolat.findById(id).exec();
    if (!doc) return hiba("A kapcsolat nem található.");
    let eredmeny: { ok: boolean; uzenet: string };
    try {
      eredmeny = await egeszsegEllenorzes(
        doc.szolgaltato as IntegracioSzolgaltato,
        gyar(kapcsolatAdat(doc)),
      );
    } catch {
      eredmeny = { ok: false, uzenet: "A hitelesítő adatok nem olvashatók (titkosítási kulcs?)." };
    }
    await IntegracioKapcsolat.updateOne(
      { _id: doc._id },
      {
        $set: {
          utolsoEllenorzes: new Date(),
          utolsoEllenorzesOk: eredmeny.ok,
          utolsoEllenorzesUzenet: eredmeny.uzenet,
        },
      },
    );
    return ok(id, { uzenet: eredmeny.uzenet, sikeres: eredmeny.ok });
  },
};

// ----------------------------------------------------------------- StackSablon

export type SablonDetail = {
  id: string;
  nev: string;
  leiras?: string;
  alapertelmezett: boolean;
  composeYaml: string;
  helyorzok: SablonHelyorzo[];
  szuksegesHalozatok: string[];
};

function toSablon(r: IStackSablon): SablonDetail {
  return {
    id: String(r._id),
    nev: r.nev,
    leiras: r.leiras,
    alapertelmezett: r.alapertelmezett,
    composeYaml: r.composeYaml,
    helyorzok: r.helyorzok.map((h) => ({
      kulcs: h.kulcs,
      cimke: h.cimke,
      kotelezo: h.kotelezo,
      alapertek: h.alapertek,
      titkos: h.titkos,
    })),
    szuksegesHalozatok: r.szuksegesHalozatok,
  };
}

export const sablonApi = {
  async listSablonok(
    query: DataTableQuery,
  ): Promise<{ data: SablonListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(query, SABLON_LIST_COLUMNS);
    const [rows, total] = await Promise.all([
      StackSablon.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      StackSablon.countDocuments(filter).exec(),
    ]);
    return {
      data: rows.map((r) => ({
        _id: String(r._id),
        nev: r.nev,
        leiras: r.leiras,
        alapertelmezett: r.alapertelmezett,
        helyorzokSzama: r.helyorzok.length,
      })),
      total,
    };
  },

  async listSablonValaszto(): Promise<Array<{ id: string; nev: string }>> {
    await connectDB();
    const rows = await StackSablon.find().sort({ nev: 1 }).select("nev").lean().exec();
    return rows.map((r) => ({ id: String(r._id), nev: r.nev }));
  },

  async getSablon(id: string): Promise<SablonDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const r = await StackSablon.findById(id).exec();
    return r ? toSablon(r) : null;
  },

  async createSablon(input: SablonInput, actorId: string): Promise<DeploymentsResult> {
    const p = sablonSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    const doc = await StackSablon.create({ ...mezok(p.data), letrehozoId: actorId });
    await egyetlenAlapertelmezett(String(doc._id), doc.alapertelmezett);
    return ok(String(doc._id));
  },

  async updateSablon(id: string, input: SablonInput): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A sablon nem található.");
    const p = sablonSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    const r = await StackSablon.updateOne({ _id: oid(id) }, { $set: mezok(p.data) }).exec();
    if (r.matchedCount === 0) return hiba("A sablon nem található.");
    await egyetlenAlapertelmezett(id, Boolean(p.data.alapertelmezett));
    return ok(id);
  },

  async deleteSablon(id: string): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A sablon nem található.");
    await connectDB();
    if (await Telepites.exists({ "stack.sablonId": id })) {
      return hiba("A sablont telepítés használja — előbb cseréld le ott.");
    }
    const r = await StackSablon.deleteOne({ _id: oid(id) }).exec();
    return r.deletedCount === 0 ? hiba("A sablon nem található.") : ok(id);
  },

  /** Preview of a render with secret values masked (never the real secrets). */
  async elonezet(
    id: string,
    ertekek: Record<string, string>,
  ): Promise<{ compose: string; hianyzo: string[]; feloldatlan: string[] } | null> {
    const s = await sablonApi.getSablon(id);
    if (!s) return null;
    const r = renderSablon(s.composeYaml, ertekek, { helyorzok: s.helyorzok, maszkolt: true });
    return { compose: r.compose, hianyzo: r.hianyzo, feloldatlan: r.feloldatlan };
  },
};

function mezok(d: SablonInput) {
  // Placeholders used in the compose but not declared are added as optional ones.
  const deklaralt = new Set((d.helyorzok ?? []).map((h) => h.kulcs));
  const extra = sablonHelyorzok(d.composeYaml)
    .filter(
      (k) => !deklaralt.has(k) && !["STACK_NAME", "IMAGE", "IMAGE_TAG", "DOMAIN"].includes(k),
    )
    .map((kulcs) => ({ kulcs, cimke: kulcs, kotelezo: false, titkos: false }));
  return {
    nev: d.nev,
    leiras: d.leiras,
    alapertelmezett: Boolean(d.alapertelmezett),
    composeYaml: d.composeYaml,
    helyorzok: [
      ...(d.helyorzok ?? []).map((h) => ({
        kulcs: h.kulcs,
        cimke: h.cimke,
        kotelezo: Boolean(h.kotelezo),
        alapertek: h.alapertek,
        titkos: Boolean(h.titkos),
      })),
      ...extra,
    ],
    szuksegesHalozatok: d.szuksegesHalozatok ?? ["nginxproxy_default"],
  };
}

async function egyetlenAlapertelmezett(id: string, aktiv: boolean) {
  if (!aktiv) return;
  await StackSablon.updateMany({ _id: { $ne: oid(id) } }, { $set: { alapertelmezett: false } });
}

// ----------------------------------------------------------------- PartnerTelepitesHozzaferes

export type HozzaferesSor = {
  id: string;
  portalFelhasznaloId: string;
  telepitesId: string;
  szint: HozzaferesSzint;
};

export const hozzaferesApi = {
  /** Which deployments of its partner the portal user is explicitly granted. */
  async hozzaferesIdk(nezo: Nezo): Promise<string[]> {
    if (!isPortal(nezo)) return [];
    await connectDB();
    return PartnerTelepitesHozzaferes.find({
      partnerId: nezo.partnerId,
      portalFelhasznaloId: nezo.portalUserId,
    }).distinct("telepitesId");
  },

  async listHozzaferesek(telepitesId: string): Promise<HozzaferesSor[]> {
    await connectDB();
    const rows = await PartnerTelepitesHozzaferes.find({ telepitesId }).lean().exec();
    return rows.map((r) => ({
      id: String(r._id),
      portalFelhasznaloId: r.portalFelhasznaloId,
      telepitesId: r.telepitesId,
      szint: r.szint,
    }));
  },

  /** Grants (or changes the level of) a portal user's access; the grant is bound to the deployment's partner. */
  async setHozzaferes(
    input: { portalFelhasznaloId: string; telepitesId: string; szint?: HozzaferesSzint },
    actorId: string,
  ): Promise<DeploymentsResult> {
    const p = hozzaferesSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    if (!validId(p.data.telepitesId)) return hiba("A telepítés nem található.");
    await connectDB();
    const t = await Telepites.findById(p.data.telepitesId).select("partnerId").lean().exec();
    if (!t) return hiba("A telepítés nem található.");
    if (!t.partnerId) return hiba("A telepítéshez nincs partner rendelve.");
    await PartnerTelepitesHozzaferes.updateOne(
      { portalFelhasznaloId: p.data.portalFelhasznaloId, telepitesId: p.data.telepitesId },
      {
        $set: { partnerId: t.partnerId, szint: p.data.szint ?? "megtekint", letrehozoId: actorId },
      },
      { upsert: true },
    );
    return ok(p.data.telepitesId);
  },

  async removeHozzaferes(portalFelhasznaloId: string, telepitesId: string): Promise<DeploymentsResult> {
    await connectDB();
    await PartnerTelepitesHozzaferes.deleteOne({ portalFelhasznaloId, telepitesId }).exec();
    return ok(telepitesId);
  },

  /**
   * Portal access check: the deployment must belong to the viewer's partner and not be archived;
   * a partner admin sees all of them, others need a grant (and `kezel` for management).
   */
  async portalHozzaferes(
    telepitesId: string,
    nezo: Nezo,
    szukseges: HozzaferesSzint = "megtekint",
  ): Promise<boolean> {
    if (!isPortal(nezo) || !nezo.partnerId || !validId(telepitesId)) return false;
    await connectDB();
    const t = await Telepites.exists({
      _id: oid(telepitesId),
      partnerId: nezo.partnerId,
      allapot: { $nin: ["archivalt", "nyilvantartas"] },
    });
    if (!t) return false;
    if (nezo.partnerAdmin && szukseges === "megtekint") return true;
    const sor = await PartnerTelepitesHozzaferes.findOne({
      portalFelhasznaloId: nezo.portalUserId,
      telepitesId,
    })
      .lean()
      .exec();
    if (nezo.partnerAdmin) return true; // MVP default: a partner admin manages all of its deployments
    if (!sor) return false;
    return szukseges === "megtekint" || sor.szint === "kezel";
  },
};
