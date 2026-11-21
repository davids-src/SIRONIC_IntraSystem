/**
 * Telepítés facade: CRUD, archive, absorbed expiry records (DomainHosting, D12), pipeline step
 * actions (wrapping the orchestrator and loading the integration clients), event log, Teendőim
 * and the portal-scoped reads.
 *
 * Reads take a `Nezo`. A portal viewer only ever gets the non-archived deployments of its own
 * partner it may see, in the allow-listed projection of `nezo.ts` — never steps, external ids,
 * stack env or notes. Credentials never appear in any DTO or event.
 */
import { connectDB, nextSequence } from "@erp/db-core";
import { buildDataTableMongoQuery, type DataTableQuery } from "@erp/ui";
import type { TaskRef } from "@erp/core";
import { folyamatHaladas, type FolyamatNezet } from "@erp/core/folyamat";
import { encryptSecret } from "@erp/lib/utils";
import {
  LEJARAT_FIGYELMEZTETES_NAPOK,
  LEPES_KULCSOK,
  LEPES_LABELS,
  type LejaratTipus,
  type LepesAllapot,
  type LepesKulcs,
  type Nezo,
  type NezoStaff,
  type SzamlazasiCiklus,
  type TelepitesAllapot,
  type TelepitesEventTipus,
} from "./constants";
import { TELEPITES_LIST_COLUMNS, type TelepitesListItem } from "./columns";
import { LEPES_FOLYAMAT_ALLAPOT, telepitesFolyamatNezet } from "./folyamat-terkep";
import { hatekonyAr, hatekonyCiklus } from "./fizetes-szabalyok";
import { alapKliensGyar, kliensekEpit, type KliensGyar } from "./kliensek";
import { hozzaferesApi } from "./integracio-api";
import type { LepesInput, LepesKliensek } from "./lepesek/tipusok";
import { Csomag, IntegracioKapcsolat, TelepitesEsemeny } from "./models/egyeb";
import { Fizetes } from "./models/egyeb";
import { Telepites, type ILepes, type ITelepites } from "./models/Telepites";
import { PORTAL_TELEPITES_MEZOK, szukit, telepitesNezoSzuro } from "./nezo";
import {
  esemenyNaploz,
  kovetkezoLepesek,
  lepesAdoptal,
  lepesEllenoriz,
  lepesKihagy,
  lepesTerv,
  lepesVegrehajt,
  lepesVisszaallit,
  type Szereplo,
} from "./orchestrator";
import {
  LEPES_DEFINICIOK,
  ervenyesLepesKulcs,
  levezetTelepitesAllapot,
} from "./szabalyok";
import {
  duplikalt,
  elsoHiba,
  es,
  hiba,
  hibaSzoveg,
  iso,
  nap,
  napStr,
  ok,
  oid,
  validId,
  type DeploymentsResult,
} from "./shared";
import {
  archivalasSchema,
  lejaratSchema,
  telepitesSchema,
  type LejaratInput,
  type TelepitesInput,
} from "./validation";

export const STAFF: NezoStaff = { kind: "staff", userId: "" };

// ----------------------------------------------------------------- DTOs

export type LepesSor = {
  kulcs: LepesKulcs;
  cimke: string;
  allapot: LepesAllapot;
  /** Same state in the shared `@erp/core/folyamat` vocabulary. */
  folyamatAllapot: string;
  kulsoId?: string;
  uzenet?: string;
  utolsoHiba?: string;
  inditva?: string;
  befejezve?: string;
  kihagyhato: boolean;
  fuggosegek: LepesKulcs[];
  /** Provider hints worth showing (e.g. the Cloudflare name servers); no internals. */
  nameServers?: string[];
};

export type StackEnvSor = {
  nev: string;
  ertek?: string;
  titkos: boolean;
  vanErtek: boolean;
};

export type LejaratSor = {
  id: string;
  tipus: LejaratTipus;
  cimke: string;
  szolgaltato?: string;
  lejarat?: string;
  autoMegujitas?: boolean;
  reszletek?: string;
};

export type TelepitesDetail = {
  id: string;
  azonosito: string;
  nev: string;
  domain?: string;
  wwwAtiranyitas: boolean;
  allapot: TelepitesAllapot;
  forras: string;
  megjegyzes?: string;
  partnerId?: string;
  csoportId?: string;
  dns: ITelepites["dns"];
  proxy: ITelepites["proxy"];
  image: ITelepites["image"];
  stack: { nev?: string; sablonId?: string; composeYaml?: string; env: StackEnvSor[] };
  csomagId?: string;
  csomagNev?: string;
  szamlazasiCiklus?: SzamlazasiCiklus;
  arFelulirasHuf?: number;
  hatekonyArHuf?: number;
  hatekonyCiklus?: SzamlazasiCiklus;
  kovetkezoSzamlazas?: string;
  utolsoFizetes?: string;
  szamlazasiMegjegyzes?: string;
  lepesek: LepesSor[];
  haladas: { kesz: number; osszes: number; szazalek: number };
  kulsoIdk: ITelepites["kulsoIdk"];
  lejaratok: LejaratSor[];
  archivalasOka?: string;
  createdAt: string;
  updatedAt: string;
};

export type EsemenySor = {
  id: string;
  tipus: TelepitesEventTipus;
  lepesKulcs?: LepesKulcs;
  uzenet: string;
  szereploId?: string;
  szereploTipus: string;
  idotartamMs?: number;
  createdAt: string;
};

export type PortalTelepites = Pick<
  {
    id: string;
    azonosito: string;
    nev: string;
    domain?: string;
    allapot: TelepitesAllapot;
    csomagNev?: string;
    arHuf?: number;
    ciklus?: SzamlazasiCiklus;
    utolsoFizetes?: string;
  },
  (typeof PORTAL_TELEPITES_MEZOK)[number]
>;

export type TelepitesOsszegzes = {
  osszes: number;
  elo: number;
  kiepites: number;
  serult: number;
  akadalyosLepes: number;
};

// ----------------------------------------------------------------- mapping

function lepesSor(l: ILepes): LepesSor {
  return {
    kulcs: l.kulcs,
    cimke: LEPES_LABELS[l.kulcs],
    allapot: l.allapot,
    folyamatAllapot: LEPES_FOLYAMAT_ALLAPOT[l.allapot],
    kulsoId: l.kulsoId ?? undefined,
    uzenet: l.uzenet ?? undefined,
    utolsoHiba: l.utolsoHiba ?? undefined,
    inditva: iso(l.inditva),
    befejezve: iso(l.befejezve),
    kihagyhato: LEPES_DEFINICIOK[l.kulcs].kihagyhato,
    fuggosegek: LEPES_DEFINICIOK[l.kulcs].fuggosegek,
    nameServers: (l.meta?.name_servers as string[] | undefined) ?? undefined,
  };
}

async function toDetail(t: ITelepites): Promise<TelepitesDetail> {
  const csomag =
    t.csomagId && validId(t.csomagId)
      ? await Csomag.findById(t.csomagId).lean().exec()
      : null;
  const csomagAr = csomag ? { arHuf: csomag.arHuf, alapCiklus: csomag.alapCiklus } : null;
  const lepesek = t.lepesek.map(lepesSor);
  const h = folyamatHaladas(lepesek.map((l) => ({ allapot: l.folyamatAllapot })));
  return {
    id: String(t._id),
    azonosito: t.azonosito,
    nev: t.nev,
    domain: t.domain,
    wwwAtiranyitas: t.wwwAtiranyitas,
    allapot: t.allapot,
    forras: t.forras,
    megjegyzes: t.megjegyzes,
    partnerId: t.partnerId,
    csoportId: t.csoportId,
    dns: t.dns,
    proxy: t.proxy,
    image: t.image,
    stack: {
      nev: t.stack.nev,
      sablonId: t.stack.sablonId,
      composeYaml: t.stack.composeYaml,
      // Secret values (and their ciphertext) are never part of a DTO.
      env: t.stack.env.map((e) => ({
        nev: e.nev,
        ertek: e.titkos ? undefined : e.ertek,
        titkos: Boolean(e.titkos),
        vanErtek: e.titkos ? Boolean(e.titkosErtek) : e.ertek !== undefined,
      })),
    },
    csomagId: t.csomagId,
    csomagNev: csomag?.nev,
    szamlazasiCiklus: t.szamlazasiCiklus,
    arFelulirasHuf: t.arFelulirasHuf,
    hatekonyArHuf: hatekonyAr(t, csomagAr) ?? undefined,
    hatekonyCiklus: hatekonyCiklus(t, csomagAr) ?? undefined,
    kovetkezoSzamlazas: iso(t.kovetkezoSzamlazas),
    utolsoFizetes: iso(t.utolsoFizetes),
    szamlazasiMegjegyzes: t.szamlazasiMegjegyzes,
    lepesek,
    haladas: { kesz: h.kesz, osszes: h.osszes, szazalek: h.szazalek },
    kulsoIdk: t.kulsoIdk,
    lejaratok: t.lejaratok.map((l) => ({
      id: String(l._id),
      tipus: l.tipus,
      cimke: l.cimke,
      szolgaltato: l.szolgaltato,
      lejarat: napStr(l.lejarat),
      autoMegujitas: l.autoMegujitas,
      reszletek: l.reszletek,
    })),
    archivalasOka: t.archivalasOka,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function ujLepesek(
  forras: "letrehozott" | "importalt",
  kulsoIdk: Partial<ITelepites["kulsoIdk"]> | undefined,
) {
  const ids = kulsoIdk ?? {};
  const van: Partial<Record<LepesKulcs, string | undefined>> = {
    cloudflare_zona: ids.cloudflareZonaId ?? undefined,
    dns_rekordok: ids.cloudflareDnsRekordIdk?.[0],
    ssl_tanusitvany:
      ids.npmTanusitvanyId != null ? String(ids.npmTanusitvanyId) : undefined,
    proxy_host: ids.npmProxyHostId != null ? String(ids.npmProxyHostId) : undefined,
    stack_letrehozas:
      ids.portainerStackId != null ? String(ids.portainerStackId) : undefined,
    stack_inditas:
      ids.portainerStackId != null ? String(ids.portainerStackId) : undefined,
  };
  return LEPES_KULCSOK.map((kulcs) => {
    // An imported deployment adopts the steps whose external resource already exists.
    const adoptalt = forras === "importalt" && van[kulcs] !== undefined;
    return {
      kulcs,
      allapot: adoptalt ? ("adoptalva" as const) : ("fuggo" as const),
      kulsoId: adoptalt ? van[kulcs] : null,
    };
  });
}

/** Stack env from the form: secret values are encrypted here; a blank secret keeps the stored one. */
function envKeszit(
  uj: NonNullable<TelepitesInput["stack"]>["env"],
  regi: ITelepites["stack"]["env"] = [],
) {
  return (uj ?? []).map((e) => {
    if (!e.titkos) return { nev: e.nev, ertek: e.ertek ?? "", titkos: false };
    if (e.ertek) return { nev: e.nev, titkos: true, titkosErtek: encryptSecret(e.ertek) };
    const marado = regi.find((r) => r.nev === e.nev && r.titkos)?.titkosErtek;
    return { nev: e.nev, titkos: true, titkosErtek: marado };
  });
}

function mezok(d: TelepitesInput, regiEnv?: ITelepites["stack"]["env"]) {
  return {
    nev: d.nev,
    domain: d.domain,
    wwwAtiranyitas: d.wwwAtiranyitas ?? true,
    partnerId: d.partnerId,
    csoportId: d.csoportId,
    megjegyzes: d.megjegyzes,
    ...(d.dns
      ? {
          dns: {
            rekordTipus: d.dns.rekordTipus,
            nev: d.dns.nev ?? "@",
            cel: d.dns.cel,
            proxied: d.dns.proxied ?? false,
          },
        }
      : {}),
    ...(d.proxy
      ? {
          proxy: {
            celHost: d.proxy.celHost,
            celPort: d.proxy.celPort,
            celSema: d.proxy.celSema ?? "http",
            websocket: d.proxy.websocket ?? true,
          },
        }
      : {}),
    ...(d.image
      ? {
          image: {
            repo: d.image.repo,
            tag: d.image.tag,
            workflowId: d.image.workflowId,
            workflowRef: d.image.workflowRef ?? "main",
          },
        }
      : {}),
    ...(d.stack
      ? {
          stack: {
            nev: d.stack.nev,
            sablonId: d.stack.sablonId,
            composeYaml: d.stack.composeYaml,
            env: envKeszit(d.stack.env, regiEnv),
          },
        }
      : {}),
    csomagId: d.csomagId,
    szamlazasiCiklus: d.szamlazasiCiklus,
    arFelulirasHuf: d.arFelulirasHuf,
  };
}

// ----------------------------------------------------------------- step actions

export type FuttatOpciok = {
  /** Test seam: ready-made clients instead of loading the stored connections. */
  kliensek?: LepesKliensek;
  kliensGyar?: KliensGyar;
  force?: boolean;
  dryRun?: boolean;
  input?: LepesInput;
};

async function kliensekBetolt(o: FuttatOpciok): Promise<LepesKliensek> {
  if (o.kliensek) return o.kliensek;
  await connectDB();
  const sorok = await IntegracioKapcsolat.find({ aktiv: true })
    .sort({ createdAt: 1 })
    .lean()
    .exec();
  return kliensekEpit(sorok, o.kliensGyar ?? alapKliensGyar);
}

async function lefuttat<T>(
  f: () => Promise<T>,
): Promise<DeploymentsResult<{ eredmeny: T }>> {
  try {
    return ok(undefined, { eredmeny: await f() });
  } catch (err) {
    return hiba(hibaSzoveg(err));
  }
}

// ----------------------------------------------------------------- facade

export const telepitesApi = {
  async listTelepitesek(
    query: DataTableQuery,
    opciok: { archivaltakkal?: boolean } = {},
  ): Promise<{ data: TelepitesListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      TELEPITES_LIST_COLUMNS,
    );
    const f = opciok.archivaltakkal
      ? filter
      : es(filter, { allapot: { $ne: "archivalt" } });
    const [rows, total] = await Promise.all([
      Telepites.find(f).sort(sort).skip(skip).limit(limit).lean<ITelepites[]>().exec(),
      Telepites.countDocuments(f).exec(),
    ]);
    const csomagIdk = [
      ...new Set(rows.map((r) => r.csomagId).filter((x): x is string => !!x)),
    ].filter(validId);
    const csomagok = csomagIdk.length
      ? await Csomag.find({ _id: { $in: csomagIdk } })
          .select("nev")
          .lean()
          .exec()
      : [];
    const cMap = new Map(csomagok.map((c) => [String(c._id), c.nev]));
    return {
      data: rows.map((r) => ({
        _id: String(r._id),
        azonosito: r.azonosito,
        nev: r.nev,
        domain: r.domain,
        allapot: r.allapot,
        partnerNev: undefined,
        csomagNev: r.csomagId ? cMap.get(r.csomagId) : undefined,
        hibasLepesek: r.lepesek.filter(
          (l) => l.allapot === "hibas" || l.allapot === "kezi",
        ).length,
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
    };
  },

  async getTelepites(
    id: string,
    nezo: NezoStaff = STAFF,
  ): Promise<TelepitesDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const t = await Telepites.findOne(es({ _id: oid(id) }, telepitesNezoSzuro(nezo)))
      .lean<ITelepites>()
      .exec();
    return t ? toDetail(t) : null;
  },

  /** Shared flow view (`FolyamatNezet`) so Feladatok/`FolyamatUt` can render the pipeline. */
  async getFolyamatNezet(id: string): Promise<FolyamatNezet | null> {
    if (!validId(id)) return null;
    await connectDB();
    const t = await Telepites.findById(id).lean<ITelepites>().exec();
    if (!t) return null;
    return telepitesFolyamatNezet({
      id: String(t._id),
      azonosito: t.azonosito,
      nev: t.nev,
      domain: t.domain,
      allapot: t.allapot,
      frissitve: t.updatedAt.toISOString(),
      lepesek: t.lepesek.map((l) => ({
        kulcs: l.kulcs,
        allapot: l.allapot,
        uzenet: l.uzenet ?? undefined,
        utolsoHiba: l.utolsoHiba ?? undefined,
      })),
    });
  },

  async listEsemenyek(telepitesId: string, limit = 100): Promise<EsemenySor[]> {
    if (!validId(telepitesId)) return [];
    await connectDB();
    const rows = await TelepitesEsemeny.find({ telepitesId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    // `reszlet` is deliberately not part of the list DTO.
    return rows.map((r) => ({
      id: String(r._id),
      tipus: r.tipus,
      lepesKulcs: r.lepesKulcs ?? undefined,
      uzenet: r.uzenet,
      szereploId: r.szereploId ?? undefined,
      szereploTipus: r.szereploTipus,
      idotartamMs: r.idotartamMs ?? undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  },

  async getOsszegzes(): Promise<TelepitesOsszegzes> {
    await connectDB();
    const rows = await Telepites.find({
      allapot: { $nin: ["archivalt", "nyilvantartas"] },
    })
      .select("allapot lepesek.allapot")
      .lean<ITelepites[]>()
      .exec();
    return {
      osszes: rows.length,
      elo: rows.filter((r) => r.allapot === "elo").length,
      kiepites: rows.filter((r) => r.allapot === "kiepites").length,
      serult: rows.filter((r) => r.allapot === "serult").length,
      akadalyosLepes: rows.reduce(
        (s, r) =>
          s +
          r.lepesek.filter((l) => l.allapot === "hibas" || l.allapot === "kezi").length,
        0,
      ),
    };
  },

  async createTelepites(
    input: TelepitesInput,
    actorId: string,
    opciok: {
      forras?: "letrehozott" | "importalt";
      kulsoIdk?: Partial<ITelepites["kulsoIdk"]>;
    } = {},
  ): Promise<DeploymentsResult> {
    const p = telepitesSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    const forras = opciok.forras ?? "letrehozott";
    const lepesek = ujLepesek(forras, opciok.kulsoIdk);
    const azonosito = `DEP-${await nextSequence("deployments:telepites", 6)}`;
    try {
      const doc = await Telepites.create({
        ...mezok(p.data),
        azonosito,
        forras,
        allapot: levezetTelepitesAllapot(
          "piszkozat",
          lepesek.map((l) => ({ kulcs: l.kulcs, allapot: l.allapot })),
        ),
        lepesek,
        kulsoIdk: { cloudflareDnsRekordIdk: [], ...(opciok.kulsoIdk ?? {}) },
        letrehozoId: actorId,
      });
      await esemenyNaploz({
        telepitesId: String(doc._id),
        tipus: forras === "importalt" ? "import" : "megjegyzes",
        szereplo: { id: actorId },
        uzenet:
          forras === "importalt" ? "Telepítés importálva." : "Telepítés létrehozva.",
      });
      return ok(String(doc._id));
    } catch (err) {
      if (duplikalt(err)) return hiba("Ezzel a domainnel már van telepítés.");
      throw err;
    }
  },

  /** Registry-only record (former DomainHosting): expiries without a pipeline. */
  async createNyilvantartas(
    input: {
      nev: string;
      partnerId?: string;
      domain?: string;
      lejaratok?: LejaratInput[];
    },
    actorId: string,
  ): Promise<DeploymentsResult> {
    if (!input.nev?.trim()) return hiba("A név kötelező.");
    const lejaratok = [];
    for (const l of input.lejaratok ?? []) {
      const p = lejaratSchema.safeParse(l);
      if (!p.success) return hiba(elsoHiba(p.error.issues));
      lejaratok.push({ ...p.data, lejarat: nap(p.data.lejarat) });
    }
    await connectDB();
    const azonosito = `DEP-${await nextSequence("deployments:telepites", 6)}`;
    try {
      const doc = await Telepites.create({
        azonosito,
        nev: input.nev.trim(),
        partnerId: input.partnerId,
        domain: input.domain?.trim().toLowerCase() || undefined,
        forras: "nyilvantartas",
        allapot: "nyilvantartas",
        lepesek: [],
        lejaratok,
        letrehozoId: actorId,
      });
      return ok(String(doc._id));
    } catch (err) {
      if (duplikalt(err)) return hiba("Ezzel a domainnel már van telepítés.");
      throw err;
    }
  },

  async updateTelepites(id: string, input: TelepitesInput): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A telepítés nem található.");
    const p = telepitesSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    const regi = await Telepites.findById(id).lean<ITelepites>().exec();
    if (!regi) return hiba("A telepítés nem található.");
    if (regi.allapot === "archivalt")
      return hiba("Archivált telepítés nem szerkeszthető.");
    try {
      await Telepites.updateOne(
        { _id: regi._id },
        { $set: mezok(p.data, regi.stack.env) },
      );
    } catch (err) {
      if (duplikalt(err)) return hiba("Ezzel a domainnel már van telepítés.");
      throw err;
    }
    return ok(id);
  },

  /** Hard delete only for a deployment nothing has happened to (no started step, no payment). */
  async deleteTelepites(id: string): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A telepítés nem található.");
    await connectDB();
    const t = await Telepites.findById(id).lean<ITelepites>().exec();
    if (!t) return hiba("A telepítés nem található.");
    const elinditva = t.lepesek.some(
      (l) => l.allapot !== "fuggo" && l.allapot !== "kihagyva",
    );
    if (elinditva || (await Fizetes.exists({ telepitesId: id }))) {
      return hiba("Elindított telepítés nem törölhető — archiváld.");
    }
    await Telepites.deleteOne({ _id: t._id });
    await TelepitesEsemeny.deleteMany({
      telepitesId: id,
      tipus: { $in: ["lepes_terv", "megjegyzes"] },
    });
    return ok(id);
  },

  async archival(
    id: string,
    okText: string,
    actorId: string,
  ): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A telepítés nem található.");
    const p = archivalasSchema.safeParse({ ok: okText });
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    const r = await Telepites.updateOne(
      { _id: oid(id), allapot: { $ne: "archivalt" } },
      {
        $set: {
          allapot: "archivalt",
          archivalasOka: p.data.ok,
          archivalasIdopont: new Date(),
          archivaltaId: actorId,
        },
      },
    );
    if (r.matchedCount === 0)
      return hiba("A telepítés nem található vagy már archivált.");
    // Default (docs/deployments/08 §7): leave overdue, cancel future periods not started yet.
    await Fizetes.updateMany(
      { telepitesId: id, allapot: "esedekes", idoszakKezdet: { $gt: new Date() } },
      { $set: { allapot: "torolve" } },
    );
    return ok(id);
  },

  async visszaallit(id: string): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A telepítés nem található.");
    await connectDB();
    const t = await Telepites.findOne({ _id: oid(id), allapot: "archivalt" })
      .lean<ITelepites>()
      .exec();
    if (!t) return hiba("A telepítés nem található vagy nem archivált.");
    const uj: TelepitesAllapot =
      t.forras === "nyilvantartas"
        ? "nyilvantartas"
        : levezetTelepitesAllapot(
            "piszkozat",
            t.lepesek.map((l) => ({ kulcs: l.kulcs, allapot: l.allapot })),
          );
    await Telepites.updateOne(
      { _id: t._id, allapot: "archivalt" },
      {
        $set: { allapot: uj },
        $unset: { archivalasOka: "", archivalasIdopont: "", archivaltaId: "" },
      },
    );
    return ok(id);
  },

  async felfuggeszt(id: string, felfuggeszt: boolean): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A telepítés nem található.");
    await connectDB();
    const t = await Telepites.findById(id).lean<ITelepites>().exec();
    if (!t || t.allapot === "archivalt" || t.allapot === "nyilvantartas") {
      return hiba("A telepítés nem található.");
    }
    const uj = felfuggeszt
      ? "felfuggesztve"
      : levezetTelepitesAllapot(
          "piszkozat",
          t.lepesek.map((l) => ({ kulcs: l.kulcs, allapot: l.allapot })),
        );
    await Telepites.updateOne({ _id: t._id }, { $set: { allapot: uj } });
    return ok(id);
  },

  // -------------------------------------------------- absorbed DomainHosting records (D12)

  async addLejarat(id: string, input: LejaratInput): Promise<DeploymentsResult> {
    if (!validId(id)) return hiba("A telepítés nem található.");
    const p = lejaratSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    const r = await Telepites.updateOne(
      { _id: oid(id) },
      { $push: { lejaratok: { ...p.data, lejarat: nap(p.data.lejarat) } } },
    );
    return r.matchedCount === 0 ? hiba("A telepítés nem található.") : ok(id);
  },

  async removeLejarat(id: string, lejaratId: string): Promise<DeploymentsResult> {
    if (!validId(id) || !validId(lejaratId)) return hiba("A bejegyzés nem található.");
    await connectDB();
    await Telepites.updateOne(
      { _id: oid(id) },
      { $pull: { lejaratok: { _id: oid(lejaratId) } } },
    );
    return ok(id);
  },

  // -------------------------------------------------- pipeline

  /** Dry-run: plans only; writes one `lepes_terv` event, mutates nothing. */
  async terv(id: string, kulcs: string, szereplo: Szereplo, o: FuttatOpciok = {}) {
    if (!ervenyesLepesKulcs(kulcs)) return hiba(`Ismeretlen lépés: ${kulcs}`);
    return lefuttat(
      async () =>
        (
          await lepesTerv({
            telepitesId: id,
            lepesKulcs: kulcs,
            szereplo,
            kliensek: await kliensekBetolt(o),
            input: o.input,
          })
        ).eredmeny,
    );
  },

  async vegrehajt(id: string, kulcs: string, szereplo: Szereplo, o: FuttatOpciok = {}) {
    if (!ervenyesLepesKulcs(kulcs)) return hiba(`Ismeretlen lépés: ${kulcs}`);
    return lefuttat(async () => {
      const k = await lepesVegrehajt({
        telepitesId: id,
        lepesKulcs: kulcs,
        szereplo,
        kliensek: await kliensekBetolt(o),
        input: o.input,
        force: o.force,
        dryRun: o.dryRun,
      });
      return { ...k.eredmeny, noop: k.noop ?? false };
    });
  },

  async adoptal(
    id: string,
    kulcs: string,
    kulsoId: string,
    szereplo: Szereplo,
    o: FuttatOpciok = {},
  ) {
    if (!ervenyesLepesKulcs(kulcs)) return hiba(`Ismeretlen lépés: ${kulcs}`);
    if (!kulsoId.trim()) return hiba("Add meg az adoptálandó erőforrás azonosítóját.");
    return lefuttat(
      async () =>
        (
          await lepesAdoptal({
            telepitesId: id,
            lepesKulcs: kulcs,
            szereplo,
            kliensek: await kliensekBetolt(o),
            input: o.input,
            kulsoId: kulsoId.trim(),
          })
        ).eredmeny,
    );
  },

  async ellenoriz(id: string, kulcs: string, szereplo: Szereplo, o: FuttatOpciok = {}) {
    if (!ervenyesLepesKulcs(kulcs)) return hiba(`Ismeretlen lépés: ${kulcs}`);
    return lefuttat(
      async () =>
        (
          await lepesEllenoriz({
            telepitesId: id,
            lepesKulcs: kulcs,
            szereplo,
            kliensek: await kliensekBetolt(o),
          })
        ).eredmeny,
    );
  },

  async kihagy(id: string, kulcs: string, ok_: string | undefined, szereplo: Szereplo) {
    if (!ervenyesLepesKulcs(kulcs)) return hiba(`Ismeretlen lépés: ${kulcs}`);
    return lefuttat(
      async () =>
        (await lepesKihagy({ telepitesId: id, lepesKulcs: kulcs, szereplo, ok: ok_ }))
          .eredmeny,
    );
  },

  async kihagyasVisszavon(id: string, kulcs: string, szereplo: Szereplo) {
    if (!ervenyesLepesKulcs(kulcs)) return hiba(`Ismeretlen lépés: ${kulcs}`);
    return lefuttat(
      async () =>
        (await lepesVisszaallit({ telepitesId: id, lepesKulcs: kulcs, szereplo }))
          .eredmeny,
    );
  },

  /** Runs pending/failed steps in order until one blocks. */
  async kovetkezok(id: string, szereplo: Szereplo, o: FuttatOpciok = {}) {
    return lefuttat(
      async () =>
        (
          await kovetkezoLepesek({
            telepitesId: id,
            szereplo,
            kliensek: await kliensekBetolt(o),
          })
        ).eredmeny,
    );
  },

  // -------------------------------------------------- portal (structurally scoped)

  async listPortalTelepitesek(nezo: Nezo): Promise<PortalTelepites[]> {
    await connectDB();
    const hozz = await hozzaferesApi.hozzaferesIdk(nezo);
    const rows = await Telepites.find(telepitesNezoSzuro(nezo, hozz))
      .sort({ nev: 1 })
      .lean<ITelepites[]>()
      .exec();
    const csomagIdk = [
      ...new Set(rows.map((r) => r.csomagId).filter((x): x is string => !!x)),
    ].filter(validId);
    const csomagok = csomagIdk.length
      ? await Csomag.find({ _id: { $in: csomagIdk } })
          .lean()
          .exec()
      : [];
    const cMap = new Map(csomagok.map((c) => [String(c._id), c]));
    return rows.map((t) => {
      const c = t.csomagId ? cMap.get(t.csomagId) : undefined;
      const csomagAr = c ? { arHuf: c.arHuf, alapCiklus: c.alapCiklus } : null;
      return szukit(
        {
          id: String(t._id),
          azonosito: t.azonosito,
          nev: t.nev,
          domain: t.domain,
          allapot: t.allapot,
          csomagNev: c?.nev,
          arHuf: hatekonyAr(t, csomagAr) ?? undefined,
          ciklus: hatekonyCiklus(t, csomagAr) ?? undefined,
          utolsoFizetes: iso(t.utolsoFizetes),
        } satisfies PortalTelepites,
        PORTAL_TELEPITES_MEZOK,
      );
    });
  },

  // -------------------------------------------------- Teendőim

  /**
   * Open items needing an operator: failed / manual steps, overdue payments, expiries within
   * `LEJARAT_FIGYELMEZTETES_NAPOK`. Which groups the viewer may see is decided by the caller
   * (the app checks the permissions), so no user/permission is read here.
   */
  async listTeendok(
    lathato: { telepites: boolean; fizetes: boolean },
    most = new Date(),
  ): Promise<TaskRef[]> {
    await connectDB();
    const ki: TaskRef[] = [];
    if (lathato.telepites) {
      const rows = await Telepites.find({
        allapot: { $nin: ["archivalt", "nyilvantartas"] },
        "lepesek.allapot": { $in: ["hibas", "kezi"] },
      })
        .lean<ITelepites[]>()
        .exec();
      for (const t of rows) {
        for (const l of t.lepesek.filter(
          (x) => x.allapot === "hibas" || x.allapot === "kezi",
        )) {
          ki.push({
            module: "deployments",
            entityType: "telepites-lepes",
            entityId: `${t._id}:${l.kulcs}`,
            title: `${t.azonosito} — ${LEPES_LABELS[l.kulcs]}`,
            status: l.allapot === "hibas" ? "Hibás lépés" : "Kézi beavatkozás kell",
            url: `/telepitesek/${t._id}`,
            contextId: String(t._id),
            contextLabel: t.domain ?? t.nev,
          });
        }
      }
      const hatar = new Date(most.getTime() + LEJARAT_FIGYELMEZTETES_NAPOK * 86_400_000);
      const lejarok = await Telepites.find({
        allapot: { $ne: "archivalt" },
        lejaratok: { $elemMatch: { lejarat: { $lte: hatar } } },
      })
        .lean<ITelepites[]>()
        .exec();
      for (const t of lejarok) {
        for (const l of t.lejaratok.filter((x) => x.lejarat && x.lejarat <= hatar)) {
          ki.push({
            module: "deployments",
            entityType: "telepites-lejarat",
            entityId: `${t._id}:${l._id}`,
            title: `${t.azonosito} — ${l.cimke} lejár`,
            status: l.lejarat! < most ? "Lejárt" : "Hamarosan lejár",
            url: `/telepitesek/${t._id}`,
            dueDate: napStr(l.lejarat),
            contextLabel: t.domain ?? t.nev,
          });
        }
      }
    }
    if (lathato.fizetes) {
      const ma = new Date(
        Date.UTC(most.getUTCFullYear(), most.getUTCMonth(), most.getUTCDate()),
      );
      const keso = await Fizetes.find({ allapot: "esedekes", idoszakVeg: { $lt: ma } })
        .sort({ idoszakVeg: 1 })
        .limit(200)
        .lean()
        .exec();
      const idk = [...new Set(keso.map((f) => f.telepitesId))].filter(validId);
      const tk = await Telepites.find({ _id: { $in: idk } })
        .select("azonosito nev domain")
        .lean()
        .exec();
      const tMap = new Map(tk.map((t) => [String(t._id), t]));
      for (const f of keso) {
        const t = tMap.get(f.telepitesId);
        ki.push({
          module: "deployments",
          entityType: "fizetes",
          entityId: String(f._id),
          title: `Késedelmes díj: ${t?.azonosito ?? f.telepitesId} (${f.osszegHuf.toLocaleString("hu-HU")} Ft)`,
          status: "Késedelmes",
          url: "/telepitesek/fizetesek",
          dueDate: napStr(f.idoszakVeg),
          contextLabel: t?.domain ?? t?.nev,
        });
      }
    }
    return ki;
  },
};
