/**
 * Bizonylat facade: szállítólevél, teljesítésigazolás, számla, jótállási jegy.
 *
 * Design rules (PROJECT_PLAN §5): single Mongo standalone (no transactions) — every state flip is
 * one conditional atomic update, side effects (stock-out, Billingo, mail) happen after the flip
 * and are retryable; internal fields are cut here, never in the UI; lazy states (`lejart`) are
 * computed at read time. This module imports no sibling module — the app supplies ports/plain data.
 */
import { createHash, randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { appendStatusChange, connectDB, nextSequence } from "@erp/db-core";
import { buildDataTableMongoQuery } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import {
  SEARCH_PER_TYPE,
  emitDomainEvent,
  type SearchHit,
  type SearchViewer,
  type ActivityRef,
  type TaskRef,
} from "@erp/core";
import { Szallitolevel, type ISzallitolevel } from "./models/Szallitolevel";
import {
  Teljesitesigazolas,
  type ITeljesitesigazolas,
} from "./models/Teljesitesigazolas";
import { Szamla, type ISzamla } from "./models/Szamla";
import { JotallasiJegy, type IJotallasiJegy } from "./models/JotallasiJegy";
import { BizonylatBeallitas } from "./models/BizonylatBeallitas";
import {
  ALAP_JOTALLASI_SZOVEG,
  IGAZOLAS_ALLAPOT_LABELS,
  IGAZOLAS_TOKEN_NAP,
  JOTALLAS_ATMENETEK,
  JOTALLAS_ALLAPOT_LABELS,
  NemSzerkeszthetoError,
  SZALLITOLEVEL_ATMENETEK,
  SZALLITOLEVEL_ALLAPOT_LABELS,
  SZAMLA_ALLAPOT_LABELS,
  SZAMLA_ATMENETEK,
  assertSzerkesztheto,
  type IgazolasAllapot,
  type JotallasTaroltAllapot,
  type Nezo,
  type SzallitolevelAllapot,
  type SzamlaTaroltAllapot,
  type Szereplo,
} from "./constants";
import {
  IGAZOLAS_LIST_COLUMNS,
  JOTALLAS_LIST_COLUMNS,
  SZALLITOLEVEL_LIST_COLUMNS,
  SZAMLA_LIST_COLUMNS,
} from "./columns";
import {
  evekHozzaad,
  igazolasLevel,
  importSorokNormalizalasa,
  jotallasAllapot,
  jotallasLejarat,
  szamlaAllapot,
  szamlaOsszeg,
  sorokOsszesites,
} from "./szamitas";
import type {
  BillingoEsemeny,
  BillingoPort,
  Eredmeny,
  IgazolasDetail,
  IgazolasLevel,
  IgazolasListItem,
  IgazolasOsszesites,
  IgazolasSor,
  ImportAdat,
  JotallasDetail,
  JotallasListItem,
  KeszletKiadasPort,
  KiadasSor,
  PartnerPillanatkep,
  SzallitolevelDetail,
  SzallitolevelListItem,
  SzallitolevelPreflight,
  SzamlaDetail,
  SzamlaListItem,
} from "./types";
import {
  igazolasElfogadasSchema,
  igazolasElutasitasSchema,
  type IgazolasInput,
  type JotallasInput,
  type SzallitolevelInput,
  type SzamlaInput,
} from "./validation";

const oid = (id: string) => new Types.ObjectId(id);
const validId = (id: string) => Types.ObjectId.isValid(id);
const iso = (d?: Date | null) => (d ? d.toISOString() : undefined);
const fail = (
  message: string,
  code?: "nem_szerkesztheto" | "ervenytelen_atmenet" | "nem_talalhato",
) => ({ ok: false, message, code }) as const;
const NEM_TALALHATO = (mit: string) => fail(`${mit} nem található`, "nem_talalhato");

/** Actor of changes nobody logged in for (customer signature, webhook). */
const RENDSZER_ID = new Types.ObjectId("000000000000000000000000");

const FUGGO_MARKER = "__fuggoben__";

export type ListaOpciok = { archivaltakkal?: boolean };

function archivSzuro(filter: Record<string, unknown>, archivaltakkal?: boolean) {
  if (archivaltakkal) return filter;
  const and = Array.isArray(filter.$and) ? (filter.$and as unknown[]) : [];
  return { ...filter, $and: [...and, { archivalt: { $ne: true } }] };
}

function szerkesztesVedett(fn: () => Promise<Eredmeny>): Promise<Eredmeny> {
  return fn().catch((e: unknown) => {
    if (e instanceof NemSzerkeszthetoError) return fail(e.message, "nem_szerkesztheto");
    throw e;
  });
}

function elozmenyek<T extends string>(
  h: Array<{ key: string; changedAt: Date; note?: string }> | undefined,
): Array<{ allapot: T; idopont: string; megjegyzes?: string }> {
  return (h ?? []).map((e) => ({
    allapot: e.key as T,
    idopont: e.changedAt.toISOString(),
    megjegyzes: e.note,
  }));
}

const kezdoAllapot = (key: string, szereplo: Szereplo) => {
  const entry = { key, changedAt: new Date(), changedBy: oid(szereplo.id) };
  return {
    status: entry,
    statusHistory: [entry],
    assignee: {
      userId: oid(szereplo.id),
      assignedAt: new Date(),
      assignedBy: oid(szereplo.id),
    },
  };
};

type MongoSzuro = Record<string, unknown>;

/**
 * Maps a list filter on a lazily computed state onto stored fields: the virtual state
 * (`lejart`) becomes `<tarolt> + date past`, the stored one `<tarolt> + date not past`.
 */
export function lazyAllapotSzuro(
  filter: MongoSzuro,
  opts: { tarolt: string; virtualis: string; mezo: string; now?: Date },
): MongoSzuro {
  const now = opts.now ?? new Date();
  const raw = filter["status.key"];
  const ertekek: string[] =
    typeof raw === "string"
      ? [raw]
      : raw && typeof raw === "object" && Array.isArray((raw as { $in?: unknown }).$in)
        ? ((raw as { $in: unknown[] }).$in.map(String) as string[])
        : [];
  if (ertekek.length === 0) return filter;
  const { ["status.key"]: _eldobott, ...rest } = filter;
  void _eldobott;
  const klozok = ertekek.map((v) => {
    if (v === opts.virtualis)
      return { "status.key": opts.tarolt, [opts.mezo]: { $lt: now } };
    if (v === opts.tarolt)
      return {
        "status.key": opts.tarolt,
        $or: [{ [opts.mezo]: { $gte: now } }, { [opts.mezo]: null }],
      };
    return { "status.key": v };
  });
  const and = Array.isArray(rest.$and) ? (rest.$and as unknown[]) : [];
  return { ...rest, $and: [...and, { $or: klozok }] };
}

async function lapozottLista<D, R>(
  find: (
    filter: MongoSzuro,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number,
  ) => Promise<D[]>,
  count: (filter: MongoSzuro) => Promise<number>,
  filterBase: MongoSzuro,
  built: ReturnType<typeof buildDataTableMongoQuery>,
  map: (d: D) => R,
): Promise<{ data: R[]; total: number }> {
  const sort =
    Object.keys(built.sort).length > 0 ? built.sort : { createdAt: -1 as const };
  const [rows, total] = await Promise.all([
    find(filterBase, sort, built.skip, built.limit),
    count(filterBase),
  ]);
  return { data: rows.map(map), total };
}

type ArchivModel = {
  updateOne(
    filter: MongoSzuro,
    update: MongoSzuro,
  ): { exec(): Promise<{ matchedCount: number }> };
};

async function archivalas(
  model: unknown,
  id: string,
  ok: string,
  szereplo: Szereplo,
  extraFeltetel: MongoSzuro,
  nev: string,
): Promise<Eredmeny> {
  if (!validId(id)) return NEM_TALALHATO(nev);
  await connectDB();
  const res = await (model as ArchivModel)
    .updateOne(
      { _id: oid(id), archivalt: { $ne: true }, ...extraFeltetel },
      {
        $set: {
          archivalt: true,
          archivalasOka: ok,
          archivalasIdopont: new Date(),
          archivaltaId: oid(szereplo.id),
        },
      },
    )
    .exec();
  return res.matchedCount === 0
    ? fail(`${nev} nem található, már archivált vagy nem archiválható`)
    : { ok: true };
}

async function visszaallitas(model: unknown, id: string, nev: string): Promise<Eredmeny> {
  if (!validId(id)) return NEM_TALALHATO(nev);
  await connectDB();
  const res = await (model as ArchivModel)
    .updateOne(
      { _id: oid(id), archivalt: true },
      {
        $set: { archivalt: false },
        $unset: { archivalasOka: 1, archivalasIdopont: 1, archivaltaId: 1 },
      },
    )
    .exec();
  return res.matchedCount === 0
    ? fail(`${nev} nem található vagy nem archivált`)
    : { ok: true };
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

// ── Mapping ────────────────────────────────────────────────────────────────────

function toSzallitoDetail(d: ISzallitolevel): SzallitolevelDetail {
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    partnerId: d.partnerId,
    partnerNev: d.partnerNev,
    projektId: d.projektId,
    kiadasNap: d.kiadasNap,
    sorok: d.sorok.map((s) => ({
      arlistaTermekId: s.arlistaTermekId,
      nev: s.nev,
      mennyiseg: s.mennyiseg,
      egyseg: s.egyseg,
      raktarhelyKod: s.raktarhelyKod,
    })),
    megjegyzes: d.megjegyzes,
    allapot: d.status.key as SzallitolevelAllapot,
    keszletKiadas: d.keszletKiadas
      ? {
          allapot: d.keszletKiadas.allapot,
          idopont: d.keszletKiadas.idopont.toISOString(),
          uzenet: d.keszletKiadas.uzenet,
        }
      : undefined,
    archivalt: Boolean(d.archivalt),
    archivalasOka: d.archivalasOka,
    elozmenyek: elozmenyek<SzallitolevelAllapot>(d.statusHistory),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

function toIgazolasDetail(d: ITeljesitesigazolas, nezo: Nezo): IgazolasDetail {
  const belso = nezo.kind === "staff" && nezo.belsoLathato === true;
  const portal = nezo.kind === "portal";
  const plain = d.toObject() as { sorok: IgazolasSor[] };
  // Allow-list per line: the frozen internal price snapshot and the purchase price stay inside.
  const sorok: IgazolasSor[] = plain.sorok.map((s) => {
    const o: IgazolasSor = {
      leiras: s.leiras,
      mennyiseg: s.mennyiseg,
      egyseg: s.egyseg,
      nettoEgysegar: s.nettoEgysegar,
      afaKulcs: s.afaKulcs,
    };
    if (belso) {
      if (s.arSnapshot) o.arSnapshot = s.arSnapshot;
      if (s.beszerzesiEgysegar !== undefined) o.beszerzesiEgysegar = s.beszerzesiEgysegar;
    }
    return o;
  });
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    cim: d.cim,
    partnerId: d.partnerId,
    partnerNev: d.partnerNev,
    partnerEmail: portal ? undefined : d.partnerEmail,
    projektId: portal ? undefined : d.projektId,
    ajanlatId: portal ? undefined : d.ajanlatId,
    munkalapIds: portal ? [] : (d.munkalapIds ?? []),
    forras: d.forras,
    munkaOsszegzes: d.munkaOsszegzes,
    idoszakKezdet: iso(d.idoszakKezdet),
    idoszakVege: iso(d.idoszakVege),
    osszOra: d.osszOra,
    penznem: d.penznem,
    sorok,
    osszegek: {
      nettoOsszeg: d.osszegek.nettoOsszeg,
      afaOsszeg: d.osszegek.afaOsszeg,
      bruttoOsszeg: d.osszegek.bruttoOsszeg,
    },
    allapot: d.status.key as IgazolasAllapot,
    kuldveAt: iso(d.kuldveAt),
    tokenLejar: portal ? undefined : iso(d.tokenLejar),
    alairas: d.alairas
      ? {
          nev: d.alairas.nev,
          beosztas: d.alairas.beosztas,
          kep: d.alairas.kep,
          alairtAt: d.alairas.alairtAt.toISOString(),
        }
      : undefined,
    elutasitasOka: d.elutasitasOka,
    belsoMegjegyzes: belso ? d.belsoMegjegyzes : undefined,
    archivalt: Boolean(d.archivalt),
    archivalasOka: portal ? undefined : d.archivalasOka,
    elozmenyek: portal ? [] : elozmenyek<IgazolasAllapot>(d.statusHistory),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/** Mongo filter every certificate read is ANDed with. Portal: own partner's sent/decided only. */
export function igazolasNezoSzuro(nezo: Nezo): MongoSzuro {
  if (nezo.kind === "staff") return {};
  if (!nezo.partnerId) return { _id: { $in: [] } };
  return {
    partnerId: nezo.partnerId,
    archivalt: { $ne: true },
    "status.key": { $ne: "piszkozat" },
  };
}

function toSzamlaDetail(d: ISzamla, now = new Date()): SzamlaDetail {
  const tarolt = d.status.key as SzamlaTaroltAllapot;
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    szamlaszam: d.szamlaszam,
    billingoRef: d.billingoRef === FUGGO_MARKER ? undefined : d.billingoRef,
    partnerId: d.partnerId,
    partnerNev: d.partnerNev,
    partnerCim: d.partnerCim,
    partnerAdoszam: d.partnerAdoszam,
    cim: d.cim,
    igazolasId: d.igazolasId,
    sorok: d.sorok.map((s) => ({
      leiras: s.leiras,
      mennyiseg: s.mennyiseg,
      egyseg: s.egyseg,
      nettoEgysegar: s.nettoEgysegar,
      afaKulcs: s.afaKulcs,
    })),
    osszeg: d.osszeg,
    penznem: d.penznem,
    kiallitva: iso(d.kiallitva),
    esedekes: iso(d.esedekes),
    kifizetve: iso(d.kifizetve),
    allapot: szamlaAllapot(tarolt, d.esedekes, now),
    tarolt,
    archivalt: Boolean(d.archivalt),
    archivalasOka: d.archivalasOka,
    elozmenyek: elozmenyek<string>(d.statusHistory),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

function toJotallasDetail(d: IJotallasiJegy, now = new Date()): JotallasDetail {
  const tarolt = d.status.key as JotallasTaroltAllapot;
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    partnerId: d.partnerId,
    partnerNev: d.partnerNev,
    szamlaszam: d.szamlaszam,
    kiallitasNap: d.kiallitasNap,
    sorok: d.sorok.map((s) => ({
      termekNev: s.termekNev,
      arlistaTermekId: s.arlistaTermekId,
      gyariSzam: s.gyariSzam,
      evek: s.evek,
      kezdet: s.kezdet.toISOString(),
      vege: s.vege.toISOString(),
    })),
    megjegyzes: d.megjegyzes,
    jogiSzoveg: d.jogiSzoveg,
    allapot: jotallasAllapot(tarolt, d.lejarat, now),
    tarolt,
    lejarat: iso(d.lejarat),
    archivalt: Boolean(d.archivalt),
    archivalasOka: d.archivalasOka,
    elozmenyek: elozmenyek<string>(d.statusHistory),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

function kiadasSorok(d: ISzallitolevel): KiadasSor[] {
  return d.sorok.map((s) => ({
    arlistaTermekId: s.arlistaTermekId,
    nev: s.nev,
    mennyiseg: s.mennyiseg,
    raktarhelyKod: s.raktarhelyKod,
  }));
}

export type KuldEredmeny =
  | { ok: true; id: string; level: IgazolasLevel }
  | {
      ok: false;
      message: string;
      code?: "nem_szerkesztheto" | "ervenytelen_atmenet" | "nem_talalhato";
    };

// ── Facade ─────────────────────────────────────────────────────────────────────

export const bizonylatApi = {
  // ── Szállítólevél ────────────────────────────────────────────────────────────

  async listSzallitolevelek(query: DataTableQuery, opciok: ListaOpciok = {}) {
    await connectDB();
    const built = buildDataTableMongoQuery(query, SZALLITOLEVEL_LIST_COLUMNS);
    return lapozottLista(
      (f, s, sk, l) =>
        Szallitolevel.find(f).sort(s).skip(sk).limit(l).lean<ISzallitolevel[]>().exec(),
      (f) => Szallitolevel.countDocuments(f).exec(),
      archivSzuro(built.filter, opciok.archivaltakkal),
      built,
      (d): SzallitolevelListItem => ({
        _id: String(d._id),
        azonosito: d.azonosito,
        partnerNev: d.partnerNev,
        allapot: d.status?.key as SzallitolevelAllapot,
        kiadasNap: d.kiadasNap,
        tetelDb: d.sorok?.length ?? 0,
        archivalt: Boolean(d.archivalt),
        createdAt: d.createdAt,
      }),
    );
  },

  async getSzallitolevel(id: string): Promise<SzallitolevelDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await Szallitolevel.findById(id).exec();
    return d ? toSzallitoDetail(d) : null;
  },

  async createSzallitolevel(
    input: SzallitolevelInput,
    partner: Pick<PartnerPillanatkep, "partnerNev">,
    szereplo: Szereplo,
  ): Promise<{ ok: true; id: string }> {
    await connectDB();
    const azonosito = `SZL-${await nextSequence("bizonylat:szallitolevel", 6)}`;
    const d = await Szallitolevel.create({
      azonosito,
      partnerId: input.partnerId,
      partnerNev: partner.partnerNev,
      projektId: input.projektId,
      kiadasNap: input.kiadasNap,
      sorok: input.sorok,
      megjegyzes: input.megjegyzes,
      ...kezdoAllapot("piszkozat", szereplo),
    });
    return { ok: true, id: String(d._id) };
  },

  /** Draft-only. */
  async updateSzallitolevel(
    id: string,
    input: SzallitolevelInput,
    partner: Pick<PartnerPillanatkep, "partnerNev">,
  ): Promise<Eredmeny> {
    if (!validId(id)) return NEM_TALALHATO("A szállítólevél");
    await connectDB();
    return szerkesztesVedett(async () => {
      const d = await Szallitolevel.findById(id).exec();
      if (!d) return NEM_TALALHATO("A szállítólevél");
      if (d.archivalt) return fail("Archivált szállítólevél nem szerkeszthető");
      assertSzerkesztheto("szallitolevel", d.status.key);
      d.set({
        partnerId: input.partnerId,
        partnerNev: partner.partnerNev,
        projektId: input.projektId,
        kiadasNap: input.kiadasNap,
        sorok: input.sorok,
        megjegyzes: input.megjegyzes,
      });
      await d.save();
      return { ok: true };
    });
  },

  /**
   * Availability per line (via the port) + same-partner/same-day duplicates, for the
   * PreflightDialog. Side-effect free.
   */
  async preflightSzallitolevel(
    id: string,
    port: KeszletKiadasPort,
  ): Promise<SzallitolevelPreflight | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await Szallitolevel.findById(id).exec();
    if (!d) return null;
    const [elerhetoseg, masok] = await Promise.all([
      port.preflight(kiadasSorok(d)),
      Szallitolevel.find({
        _id: { $ne: d._id },
        partnerId: d.partnerId,
        kiadasNap: d.kiadasNap,
        "status.key": { $ne: "sztorno" },
        archivalt: { $ne: true },
      })
        .lean<ISzallitolevel[]>()
        .exec(),
    ]);
    const sajat = new Set(d.sorok.map((s) => s.arlistaTermekId));
    return {
      osszesElegendo: elerhetoseg.osszesElegendo,
      sorok: elerhetoseg.sorok,
      duplikaciok: masok.map((m) => ({
        id: String(m._id),
        azonosito: m.azonosito,
        allapot: m.status.key as SzallitolevelAllapot,
        kozosTermekek: m.sorok
          .filter((s) => sajat.has(s.arlistaTermekId))
          .map((s) => s.nev),
      })),
    };
  },

  /**
   * Issues a draft: preflight → atomic flip to `kiadva` → stock-out through the port (keyed by the
   * note id). Calling it again (double click, retry) never deducts twice: a non-draft note is
   * routed to `ujraKiadSzallitolevel`, which is a no-op once the stock-out succeeded.
   */
  async kiadSzallitolevel(
    id: string,
    szereplo: Szereplo,
    port: KeszletKiadasPort,
  ): Promise<Eredmeny> {
    if (!validId(id)) return NEM_TALALHATO("A szállítólevél");
    await connectDB();
    const d = await Szallitolevel.findById(id).exec();
    if (!d) return NEM_TALALHATO("A szállítólevél");
    if (d.archivalt) return fail("Archivált szállítólevél nem adható ki");
    if (d.status.key === "kiadva") return bizonylatApi.ujraKiadSzallitolevel(id, port);
    if (d.status.key !== "piszkozat")
      return fail("Csak piszkozat szállítólevél adható ki", "ervenytelen_atmenet");
    if (d.sorok.length === 0) return fail("Üres szállítólevél nem adható ki");

    const pre = await port.preflight(kiadasSorok(d));
    if (!pre.osszesElegendo) {
      const hiany = pre.sorok
        .filter((s) => !s.elegendo)
        .map(
          (s) =>
            s.uzenet ??
            `${s.nev ?? s.arlistaTermekId}: kért ${s.kert}, szabad ${s.szabad}`,
        );
      return fail(`Nincs elég készlet: ${hiany.join("; ")}`);
    }

    const entry = { key: "kiadva", changedAt: new Date(), changedBy: oid(szereplo.id) };
    const res = await Szallitolevel.updateOne(
      { _id: d._id, "status.key": "piszkozat", archivalt: { $ne: true } },
      {
        $set: {
          status: entry,
          keszletKiadas: { allapot: "fuggoben", idopont: new Date() },
        },
        $push: { statusHistory: entry },
      },
    ).exec();
    if (res.matchedCount === 0) {
      // Lost a race with a concurrent call: converge through the idempotent retry path.
      const mostani = await Szallitolevel.findById(id).exec();
      if (mostani?.status.key === "kiadva")
        return bizonylatApi.ujraKiadSzallitolevel(id, port);
      return fail("A szállítólevél állapota közben megváltozott", "ervenytelen_atmenet");
    }
    return bizonylatApi.ujraKiadSzallitolevel(id, port);
  },

  /** Calls the stock-out port for an issued note whose stock-out has not succeeded (yet). */
  async ujraKiadSzallitolevel(id: string, port: KeszletKiadasPort): Promise<Eredmeny> {
    if (!validId(id)) return NEM_TALALHATO("A szállítólevél");
    await connectDB();
    const d = await Szallitolevel.findById(id).exec();
    if (!d) return NEM_TALALHATO("A szállítólevél");
    if (d.status.key !== "kiadva") return fail("A szállítólevél nincs kiadva");
    if (d.keszletKiadas?.allapot === "kesz") return { ok: true, uzenet: "Már kiadva" };
    let eredmeny: { ok: boolean; uzenet?: string };
    try {
      const r = await port.kiad(kiadasSorok(d), {
        tipus: "szallitolevel",
        id: String(d._id),
        azonosito: d.azonosito,
      });
      eredmeny = r.ok ? { ok: true, uzenet: r.uzenet } : { ok: false, uzenet: r.message };
    } catch (e) {
      eredmeny = {
        ok: false,
        uzenet: e instanceof Error ? e.message : "Ismeretlen hiba",
      };
    }
    await Szallitolevel.updateOne(
      { _id: d._id },
      {
        $set: {
          keszletKiadas: {
            allapot: eredmeny.ok ? "kesz" : "hiba",
            idopont: new Date(),
            uzenet: eredmeny.uzenet,
          },
        },
      },
    ).exec();
    return eredmeny.ok
      ? { ok: true }
      : fail(
          `A kiadás rögzítve, de a készletlevonás sikertelen: ${eredmeny.uzenet ?? ""}`,
        );
  },

  /** Cancels a draft or issued note. Stock deducted at issue is NOT restored automatically. */
  async sztornoSzallitolevel(
    id: string,
    szereplo: Szereplo,
    megjegyzes?: string,
  ): Promise<Eredmeny> {
    if (!validId(id)) return NEM_TALALHATO("A szállítólevél");
    await connectDB();
    const d = await Szallitolevel.findById(id).exec();
    if (!d) return NEM_TALALHATO("A szállítólevél");
    const regi = d.status.key as SzallitolevelAllapot;
    if (!SZALLITOLEVEL_ATMENETEK[regi].includes("sztorno"))
      return fail(
        `A szállítólevél „${SZALLITOLEVEL_ALLAPOT_LABELS[regi]}” állapotból nem sztornózható`,
        "ervenytelen_atmenet",
      );
    const kellett = d.keszletKiadas?.allapot === "kesz";
    appendStatusChange(d, "sztorno", oid(szereplo.id), megjegyzes);
    await d.save();
    return {
      ok: true,
      uzenet: kellett
        ? "A szállítólevél sztornózva. A kiadott készletet kézi bevételezéssel kell visszavezetni."
        : undefined,
    };
  },

  /** Issued notes cannot be archived — cancel first. */
  async archivSzallitolevel(id: string, ok: string, szereplo: Szereplo) {
    return archivalas(
      Szallitolevel,
      id,
      ok,
      szereplo,
      { "status.key": { $ne: "kiadva" } },
      "A szállítólevél",
    );
  },
  restoreSzallitolevel: (id: string) =>
    visszaallitas(Szallitolevel, id, "A szállítólevél"),

  // ── Teljesítésigazolás ───────────────────────────────────────────────────────

  async listIgazolasok(
    query: DataTableQuery,
    nezo: Nezo,
    opciok: ListaOpciok = {},
  ): Promise<{ data: IgazolasListItem[]; total: number }> {
    await connectDB();
    const built = buildDataTableMongoQuery(query, IGAZOLAS_LIST_COLUMNS);
    const base = archivSzuro(built.filter, opciok.archivaltakkal);
    const nezoSzuro = igazolasNezoSzuro(nezo);
    const and = Array.isArray(base.$and) ? (base.$and as unknown[]) : [];
    const filter: MongoSzuro = { ...base, $and: [...and, nezoSzuro] };
    return lapozottLista(
      (f, s, sk, l) =>
        Teljesitesigazolas.find(f)
          .sort(s)
          .skip(sk)
          .limit(l)
          .lean<ITeljesitesigazolas[]>()
          .exec(),
      (f) => Teljesitesigazolas.countDocuments(f).exec(),
      filter,
      built,
      (d): IgazolasListItem => ({
        _id: String(d._id),
        azonosito: d.azonosito,
        cim: d.cim,
        partnerNev: d.partnerNev,
        allapot: d.status?.key as IgazolasAllapot,
        bruttoOsszeg: d.osszegek?.bruttoOsszeg ?? 0,
        penznem: d.penznem,
        archivalt: Boolean(d.archivalt),
        createdAt: d.createdAt,
      }),
    );
  },

  async getIgazolas(id: string, nezo: Nezo): Promise<IgazolasDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await Teljesitesigazolas.findOne({
      $and: [{ _id: oid(id) }, igazolasNezoSzuro(nezo)],
    }).exec();
    return d ? toIgazolasDetail(d, nezo) : null;
  },

  /**
   * Creates a draft. Lines come from the form or from `importAdat` (plain data the app collected
   * from an offer / worklog / project); totals are always recalculated here.
   */
  async createIgazolas(
    input: IgazolasInput,
    partner: PartnerPillanatkep,
    szereplo: Szereplo,
    importAdat?: ImportAdat,
  ): Promise<{ ok: true; id: string }> {
    await connectDB();
    const imp = importAdat ? importSorokNormalizalasa(importAdat) : undefined;
    const sorok = input.sorok.length > 0 ? input.sorok : (imp?.sorok ?? []);
    const azonosito = `TI-${await nextSequence("bizonylat:igazolas", 6)}`;
    const forras = importAdat?.forras ?? input.forras;
    const d = await Teljesitesigazolas.create({
      azonosito,
      cim: input.cim,
      partnerId: input.partnerId,
      partnerNev: partner.partnerNev,
      partnerEmail: input.partnerEmail ?? partner.partnerEmail,
      projektId:
        input.projektId ?? (forras === "projekt" ? importAdat?.forrasId : undefined),
      ajanlatId:
        input.ajanlatId ?? (forras === "ajanlat" ? importAdat?.forrasId : undefined),
      munkalapIds:
        input.munkalapIds.length > 0
          ? input.munkalapIds
          : (importAdat?.munkalapIds ?? []),
      forras,
      munkaOsszegzes: input.munkaOsszegzes,
      idoszakKezdet: input.idoszakKezdet,
      idoszakVege: input.idoszakVege,
      osszOra: input.osszOra ?? imp?.osszOra,
      penznem: input.penznem,
      belsoMegjegyzes: input.belsoMegjegyzes,
      sorok,
      osszegek: sorokOsszesites(sorok),
      ...kezdoAllapot("piszkozat", szereplo),
    });
    return { ok: true, id: String(d._id) };
  },

  /** Draft-only editing. */
  async updateIgazolas(
    id: string,
    input: IgazolasInput,
    partner: PartnerPillanatkep,
  ): Promise<Eredmeny> {
    if (!validId(id)) return NEM_TALALHATO("Az igazolás");
    await connectDB();
    return szerkesztesVedett(async () => {
      const d = await Teljesitesigazolas.findById(id).exec();
      if (!d) return NEM_TALALHATO("Az igazolás");
      if (d.archivalt) return fail("Archivált igazolás nem szerkeszthető");
      assertSzerkesztheto("igazolas", d.status.key);
      d.set({
        cim: input.cim,
        partnerId: input.partnerId,
        partnerNev: partner.partnerNev,
        partnerEmail: input.partnerEmail ?? partner.partnerEmail,
        projektId: input.projektId,
        ajanlatId: input.ajanlatId,
        munkalapIds: input.munkalapIds,
        forras: input.forras,
        munkaOsszegzes: input.munkaOsszegzes,
        idoszakKezdet: input.idoszakKezdet,
        idoszakVege: input.idoszakVege,
        osszOra: input.osszOra,
        penznem: input.penznem,
        belsoMegjegyzes: input.belsoMegjegyzes,
        sorok: input.sorok,
        osszegek: sorokOsszesites(input.sorok),
      });
      await d.save();
      return { ok: true };
    });
  },

  /**
   * Sends (or re-sends) the certificate: generates a random one-time magic-link token (only its
   * SHA-256 hash is stored, with an expiry) and returns the mail payload for the app to deliver.
   * `alapUrl` is the public app URL used to build the link.
   */
  async kuldIgazolas(
    id: string,
    szereplo: Szereplo,
    opciok: { alapUrl: string; ervenyessegNap?: number },
  ): Promise<KuldEredmeny> {
    if (!validId(id)) return NEM_TALALHATO("Az igazolás");
    await connectDB();
    const d = await Teljesitesigazolas.findById(id).exec();
    if (!d) return NEM_TALALHATO("Az igazolás");
    if (d.archivalt) return fail("Archivált igazolás nem küldhető");
    const regi = d.status.key as IgazolasAllapot;
    if (regi !== "piszkozat" && regi !== "elkuldve")
      return fail(
        `A(z) „${IGAZOLAS_ALLAPOT_LABELS[regi]}” igazolás már lezárt, nem küldhető újra`,
        "ervenytelen_atmenet",
      );
    if (d.sorok.length === 0) return fail("Üres igazolás nem küldhető el");
    if (!d.partnerEmail) return fail("Nincs megadva e-mail cím a küldéshez");

    const token = randomBytes(32).toString("base64url");
    const lejar = new Date(
      Date.now() + (opciok.ervenyessegNap ?? IGAZOLAS_TOKEN_NAP) * 86_400_000,
    );
    const entry = {
      key: "elkuldve",
      changedAt: new Date(),
      changedBy: oid(szereplo.id),
      note: regi === "elkuldve" ? "Újraküldve" : undefined,
    };
    const res = await Teljesitesigazolas.updateOne(
      {
        _id: d._id,
        "status.key": { $in: ["piszkozat", "elkuldve"] },
        archivalt: { $ne: true },
      },
      {
        $set: {
          status: entry,
          tokenHash: tokenHash(token),
          tokenLejar: lejar,
          kuldveAt: new Date(),
        },
        $push: { statusHistory: entry },
      },
    ).exec();
    if (res.matchedCount === 0)
      return fail("Az igazolás állapota közben megváltozott", "ervenytelen_atmenet");

    const linkUt = `/portal/igazolas/${token}`;
    const link = `${opciok.alapUrl.replace(/\/+$/, "")}${linkUt}`;
    const datum = (x?: Date) =>
      x ? x.toLocaleDateString("hu-HU", { timeZone: "Europe/Budapest" }) : undefined;
    const idoszak =
      d.idoszakKezdet || d.idoszakVege
        ? `${datum(d.idoszakKezdet) ?? "…"} – ${datum(d.idoszakVege) ?? "…"}`
        : undefined;
    const tartalom = igazolasLevel({
      azonosito: d.azonosito,
      cim: d.cim,
      partnerNev: d.partnerNev,
      idoszak,
      link,
    });
    return {
      ok: true,
      id: String(d._id),
      level: {
        to: d.partnerEmail,
        toNev: d.partnerNev,
        ...tartalom,
        linkUt,
        lejar: lejar.toISOString(),
      },
    };
  },

  /** Resolves a magic-link token to `{id, partnerId}`; null when unknown, expired, used or archived. */
  async feloldIgazolasToken(
    token: string,
  ): Promise<{ id: string; partnerId: string } | null> {
    if (!token || token.length < 20) return null;
    await connectDB();
    const d = await Teljesitesigazolas.findOne({
      tokenHash: tokenHash(token),
      tokenLejar: { $gt: new Date() },
      "status.key": "elkuldve",
      archivalt: { $ne: true },
    })
      .select("_id partnerId")
      .lean<{ _id: Types.ObjectId; partnerId: string }>()
      .exec();
    return d ? { id: String(d._id), partnerId: d.partnerId } : null;
  },

  async getIgazolasTokennel(token: string): Promise<IgazolasDetail | null> {
    const r = await bizonylatApi.feloldIgazolasToken(token);
    return r
      ? bizonylatApi.getIgazolas(r.id, { kind: "portal", partnerId: r.partnerId })
      : null;
  },

  /** Portal sign-off: name + title + signature image; `signedAt` is set here, never by the client. */
  async elfogadIgazolas(id: string, nezo: Nezo, adat: unknown): Promise<Eredmeny> {
    if (nezo.kind !== "portal" || !nezo.partnerId || !validId(id))
      return fail("Az aláírást az ügyfél adhatja meg a portálon");
    const parsed = igazolasElfogadasSchema.safeParse(adat);
    if (!parsed.success)
      return fail(parsed.error.issues[0]?.message ?? "Érvénytelen aláírás");
    await connectDB();
    const entry = { key: "elfogadva", changedAt: new Date(), changedBy: RENDSZER_ID };
    const d = await Teljesitesigazolas.findOneAndUpdate(
      {
        _id: oid(id),
        partnerId: nezo.partnerId,
        "status.key": "elkuldve",
        archivalt: { $ne: true },
      },
      {
        $set: {
          status: entry,
          alairas: { ...parsed.data, alairtAt: new Date() },
        },
        $unset: { tokenHash: 1, tokenLejar: 1 },
        $push: { statusHistory: entry },
      },
      { returnDocument: "after" },
    ).exec();
    if (!d) return fail("Az igazolás nem található vagy már lezárt");
    try {
      await emitDomainEvent("teljesitesigazolas.elfogadva", {
        igazolasId: String(d._id),
        azonosito: d.azonosito,
        partnerId: d.partnerId,
        partnerNev: d.partnerNev,
        projektId: d.projektId,
        nettoOsszeg: d.osszegek.nettoOsszeg,
        bruttoOsszeg: d.osszegek.bruttoOsszeg,
        penznem: d.penznem,
        alairoNev: parsed.data.nev,
      });
    } catch (e) {
      console.error("[bizonylat] teljesitesigazolas.elfogadva event failed", e);
    }
    return { ok: true };
  },

  async elutasitIgazolas(id: string, nezo: Nezo, adat: unknown): Promise<Eredmeny> {
    if (nezo.kind !== "portal" || !nezo.partnerId || !validId(id))
      return fail("Az elutasítást az ügyfél adhatja meg a portálon");
    const parsed = igazolasElutasitasSchema.safeParse(adat);
    if (!parsed.success)
      return fail(parsed.error.issues[0]?.message ?? "Az ok megadása kötelező");
    await connectDB();
    const entry = {
      key: "elutasitva",
      changedAt: new Date(),
      changedBy: RENDSZER_ID,
      note: parsed.data.ok,
    };
    const res = await Teljesitesigazolas.updateOne(
      {
        _id: oid(id),
        partnerId: nezo.partnerId,
        "status.key": "elkuldve",
        archivalt: { $ne: true },
      },
      {
        $set: { status: entry, elutasitasOka: parsed.data.ok },
        $unset: { tokenHash: 1, tokenLejar: 1 },
        $push: { statusHistory: entry },
      },
    ).exec();
    return res.matchedCount === 0
      ? fail("Az igazolás nem található vagy már lezárt")
      : { ok: true };
  },

  async elfogadIgazolasTokennel(token: string, adat: unknown): Promise<Eredmeny> {
    const r = await bizonylatApi.feloldIgazolasToken(token);
    if (!r) return fail("A hivatkozás érvénytelen vagy lejárt");
    return bizonylatApi.elfogadIgazolas(
      r.id,
      { kind: "portal", partnerId: r.partnerId },
      adat,
    );
  },

  async elutasitIgazolasTokennel(token: string, adat: unknown): Promise<Eredmeny> {
    const r = await bizonylatApi.feloldIgazolasToken(token);
    if (!r) return fail("A hivatkozás érvénytelen vagy lejárt");
    return bizonylatApi.elutasitIgazolas(
      r.id,
      { kind: "portal", partnerId: r.partnerId },
      adat,
    );
  },

  /** KPI tiles: signed vs pending value and counts (non-archived, scoped to the viewer). */
  async osszesitesIgazolas(nezo: Nezo): Promise<IgazolasOsszesites> {
    await connectDB();
    const rows = await Teljesitesigazolas.aggregate<{
      _id: string;
      db: number;
      netto: number;
      brutto: number;
    }>([
      { $match: { $and: [{ archivalt: { $ne: true } }, igazolasNezoSzuro(nezo)] } },
      {
        $group: {
          _id: "$status.key",
          db: { $sum: 1 },
          netto: { $sum: "$osszegek.nettoOsszeg" },
          brutto: { $sum: "$osszegek.bruttoOsszeg" },
        },
      },
    ]).exec();
    const get = (k: string) => rows.find((r) => r._id === k);
    return {
      alairtDb: get("elfogadva")?.db ?? 0,
      fuggoDb: get("elkuldve")?.db ?? 0,
      elutasitottDb: get("elutasitva")?.db ?? 0,
      piszkozatDb: get("piszkozat")?.db ?? 0,
      alairtNetto: get("elfogadva")?.netto ?? 0,
      alairtBrutto: get("elfogadva")?.brutto ?? 0,
      fuggoNetto: get("elkuldve")?.netto ?? 0,
      fuggoBrutto: get("elkuldve")?.brutto ?? 0,
    };
  },

  archivIgazolas: (id: string, ok: string, szereplo: Szereplo) =>
    archivalas(Teljesitesigazolas, id, ok, szereplo, {}, "Az igazolás"),
  restoreIgazolas: (id: string) => visszaallitas(Teljesitesigazolas, id, "Az igazolás"),

  // ── Számla ───────────────────────────────────────────────────────────────────

  async listSzamlak(query: DataTableQuery, opciok: ListaOpciok = {}) {
    await connectDB();
    const built = buildDataTableMongoQuery(query, SZAMLA_LIST_COLUMNS);
    const filter = lazyAllapotSzuro(archivSzuro(built.filter, opciok.archivaltakkal), {
      tarolt: "elkuldve",
      virtualis: "lejart",
      mezo: "esedekes",
    });
    const now = new Date();
    return lapozottLista(
      (f, s, sk, l) => Szamla.find(f).sort(s).skip(sk).limit(l).lean<ISzamla[]>().exec(),
      (f) => Szamla.countDocuments(f).exec(),
      filter,
      built,
      (d): SzamlaListItem => ({
        _id: String(d._id),
        azonosito: d.azonosito,
        szamlaszam: d.szamlaszam,
        partnerNev: d.partnerNev,
        allapot: szamlaAllapot(d.status?.key as SzamlaTaroltAllapot, d.esedekes, now),
        osszeg: d.osszeg,
        penznem: d.penznem,
        esedekes: d.esedekes,
        archivalt: Boolean(d.archivalt),
        createdAt: d.createdAt,
      }),
    );
  },

  async getSzamla(id: string): Promise<SzamlaDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await Szamla.findById(id).exec();
    return d ? toSzamlaDetail(d) : null;
  },

  async createSzamla(
    input: SzamlaInput,
    partner: PartnerPillanatkep,
    szereplo: Szereplo,
  ): Promise<{ ok: true; id: string }> {
    await connectDB();
    const azonosito = `SZA-${await nextSequence("bizonylat:szamla", 6)}`;
    const d = await Szamla.create({
      azonosito,
      partnerId: input.partnerId,
      partnerNev: partner.partnerNev,
      partnerCim: partner.partnerCim,
      partnerAdoszam: partner.partnerAdoszam,
      cim: input.cim,
      igazolasId: input.igazolasId,
      sorok: input.sorok,
      osszeg: szamlaOsszeg(input.sorok),
      penznem: input.penznem,
      esedekes: input.esedekes,
      ...kezdoAllapot("piszkozat", szereplo),
    });
    return { ok: true, id: String(d._id) };
  },

  /** Draft-only: an issued/sent/paid invoice is never edited. */
  async updateSzamla(
    id: string,
    input: SzamlaInput,
    partner: PartnerPillanatkep,
  ): Promise<Eredmeny> {
    if (!validId(id)) return NEM_TALALHATO("A számla");
    await connectDB();
    return szerkesztesVedett(async () => {
      const d = await Szamla.findById(id).exec();
      if (!d) return NEM_TALALHATO("A számla");
      if (d.archivalt) return fail("Archivált számla nem szerkeszthető");
      assertSzerkesztheto("szamla", d.status.key);
      if (d.billingoRef) return fail("A számla kiállítás alatt áll, nem szerkeszthető");
      d.set({
        partnerId: input.partnerId,
        partnerNev: partner.partnerNev,
        partnerCim: partner.partnerCim,
        partnerAdoszam: partner.partnerAdoszam,
        cim: input.cim,
        igazolasId: input.igazolasId,
        sorok: input.sorok,
        osszeg: szamlaOsszeg(input.sorok),
        penznem: input.penznem,
        esedekes: input.esedekes,
      });
      await d.save();
      return { ok: true };
    });
  },

  /**
   * Issues a draft at Billingo through the port. The draft is claimed first with a conditional
   * update so a double click calls Billingo once; a failed call releases the claim.
   */
  async kiallitSzamla(
    id: string,
    szereplo: Szereplo,
    port: BillingoPort,
  ): Promise<Eredmeny> {
    if (!validId(id)) return NEM_TALALHATO("A számla");
    await connectDB();
    const claim = await Szamla.findOneAndUpdate(
      {
        _id: oid(id),
        "status.key": "piszkozat",
        billingoRef: { $exists: false },
        archivalt: { $ne: true },
      },
      { $set: { billingoRef: FUGGO_MARKER } },
      { returnDocument: "after" },
    ).exec();
    if (!claim)
      return fail(
        "Csak nem archivált piszkozat számla állítható ki (vagy a kiállítás már folyamatban van)",
        "ervenytelen_atmenet",
      );
    if (claim.sorok.length === 0) {
      await Szamla.updateOne({ _id: claim._id }, { $unset: { billingoRef: 1 } }).exec();
      return fail("Üres számla nem állítható ki");
    }
    const esedekes = claim.esedekes ?? new Date(Date.now() + 8 * 86_400_000);
    let r: Awaited<ReturnType<BillingoPort["kiallit"]>>;
    try {
      r = await port.kiallit({
        id: String(claim._id),
        azonosito: claim.azonosito,
        partnerNev: claim.partnerNev,
        partnerCim: claim.partnerCim,
        partnerAdoszam: claim.partnerAdoszam,
        cim: claim.cim,
        penznem: claim.penznem,
        esedekes: esedekes.toISOString(),
        sorok: claim.sorok.map((s) => ({ ...s })),
        osszeg: claim.osszeg,
      });
    } catch (e) {
      r = { ok: false, message: e instanceof Error ? e.message : "Ismeretlen hiba" };
    }
    if (!r.ok) {
      await Szamla.updateOne({ _id: claim._id }, { $unset: { billingoRef: 1 } }).exec();
      return fail(`A Billingo kiállítás sikertelen: ${r.message}`);
    }
    const entry = {
      key: "elkuldve",
      changedAt: new Date(),
      changedBy: oid(szereplo.id),
      note: "Kiállítva (Billingo)",
    };
    await Szamla.updateOne(
      { _id: claim._id },
      {
        $set: {
          billingoRef: r.billingoRef,
          szamlaszam: r.szamlaszam,
          kiallitva: new Date(),
          esedekes,
          status: entry,
        },
        $push: { statusHistory: entry },
      },
    ).exec();
    return { ok: true, uzenet: r.szamlaszam };
  },

  /** Manual transitions (guarded by `SZAMLA_ATMENETEK`); `lejart` is never a target. */
  async changeSzamlaAllapot(
    id: string,
    allapot: SzamlaTaroltAllapot,
    szereplo: Szereplo,
    megjegyzes?: string,
  ): Promise<Eredmeny> {
    if (!validId(id)) return NEM_TALALHATO("A számla");
    await connectDB();
    const d = await Szamla.findById(id).exec();
    if (!d) return NEM_TALALHATO("A számla");
    if (d.archivalt) return fail("Archivált számla állapota nem módosítható");
    const regi = d.status.key as SzamlaTaroltAllapot;
    if (!SZAMLA_ATMENETEK[regi]?.includes(allapot))
      return fail(
        `A számla „${SZAMLA_ALLAPOT_LABELS[regi]}” állapotból nem állítható „${SZAMLA_ALLAPOT_LABELS[allapot]}” állapotba`,
        "ervenytelen_atmenet",
      );
    const entry = {
      key: allapot,
      changedAt: new Date(),
      changedBy: oid(szereplo.id),
      note: megjegyzes,
    };
    const res = await Szamla.updateOne(
      { _id: d._id, "status.key": regi },
      {
        $set: {
          status: entry,
          ...(allapot === "kifizetve" ? { kifizetve: new Date() } : {}),
        },
        $push: { statusHistory: entry },
      },
    ).exec();
    return res.matchedCount === 0
      ? fail("A számla állapota közben megváltozott", "ervenytelen_atmenet")
      : { ok: true };
  },

  /**
   * Idempotent paid transition driven by the Billingo webhook: an already paid (or cancelled)
   * invoice is a no-op success, an unknown reference is acknowledged (retrying would not help).
   */
  async billingoKifizetve(
    esemeny: BillingoEsemeny,
  ): Promise<{ ok: true; message: string }> {
    await connectDB();
    const entry = {
      key: "kifizetve",
      changedAt: new Date(),
      changedBy: RENDSZER_ID,
      note: "Billingo webhook",
    };
    const res = await Szamla.updateOne(
      { billingoRef: esemeny.billingoRef, "status.key": "elkuldve" },
      { $set: { status: entry, kifizetve: new Date() }, $push: { statusHistory: entry } },
    ).exec();
    if (res.matchedCount > 0) return { ok: true, message: "Kifizetve" };
    const l = await Szamla.findOne({ billingoRef: esemeny.billingoRef })
      .select("status")
      .lean<{ status: { key: string } }>()
      .exec();
    if (!l) return { ok: true, message: "Ismeretlen számla" };
    return { ok: true, message: `Nincs teendő (${l.status.key})` };
  },

  /** Billingo state check (manual sync button) — marks paid through the same idempotent path. */
  async szinkronSzamla(id: string, port: BillingoPort): Promise<Eredmeny> {
    if (!validId(id)) return NEM_TALALHATO("A számla");
    await connectDB();
    const d = await Szamla.findById(id).exec();
    if (!d?.billingoRef || d.billingoRef === FUGGO_MARKER)
      return fail("A számla nincs a Billingóban");
    const r = await port.allapot(d.billingoRef);
    if (!r.ok) return fail(`A Billingo lekérdezés sikertelen: ${r.message}`);
    if (r.kifizetve) {
      await bizonylatApi.billingoKifizetve({
        tipus: "kifizetve",
        billingoRef: d.billingoRef,
      });
      return { ok: true, uzenet: "Kifizetve" };
    }
    return { ok: true, uzenet: "Nincs változás" };
  },

  archivSzamla: (id: string, ok: string, szereplo: Szereplo) =>
    archivalas(Szamla, id, ok, szereplo, {}, "A számla"),
  restoreSzamla: (id: string) => visszaallitas(Szamla, id, "A számla"),

  // ── Jótállási jegy ───────────────────────────────────────────────────────────

  /** The editable legal text (settings), falling back to the built-in default. */
  async getJotallasiSzoveg(): Promise<string> {
    await connectDB();
    const b = await BizonylatBeallitas.findOne({ kulcs: "alap" })
      .lean<{ jotallasJogiSzoveg?: string }>()
      .exec();
    return b?.jotallasJogiSzoveg?.trim() || ALAP_JOTALLASI_SZOVEG;
  },

  async setJotallasiSzoveg(szoveg: string, szereplo: Szereplo): Promise<Eredmeny> {
    await connectDB();
    await BizonylatBeallitas.updateOne(
      { kulcs: "alap" },
      { $set: { jotallasJogiSzoveg: szoveg, modositotta: oid(szereplo.id) } },
      { upsert: true },
    ).exec();
    return { ok: true };
  },

  async listJotallasok(query: DataTableQuery, opciok: ListaOpciok = {}) {
    await connectDB();
    const built = buildDataTableMongoQuery(query, JOTALLAS_LIST_COLUMNS);
    const filter = lazyAllapotSzuro(archivSzuro(built.filter, opciok.archivaltakkal), {
      tarolt: "aktiv",
      virtualis: "lejart",
      mezo: "lejarat",
    });
    const now = new Date();
    return lapozottLista(
      (f, s, sk, l) =>
        JotallasiJegy.find(f).sort(s).skip(sk).limit(l).lean<IJotallasiJegy[]>().exec(),
      (f) => JotallasiJegy.countDocuments(f).exec(),
      filter,
      built,
      (d): JotallasListItem => ({
        _id: String(d._id),
        azonosito: d.azonosito,
        partnerNev: d.partnerNev,
        szamlaszam: d.szamlaszam,
        allapot: jotallasAllapot(d.status?.key as JotallasTaroltAllapot, d.lejarat, now),
        lejarat: d.lejarat,
        kiallitasNap: d.kiallitasNap,
        archivalt: Boolean(d.archivalt),
        createdAt: d.createdAt,
      }),
    );
  },

  async getJotallas(id: string): Promise<JotallasDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await JotallasiJegy.findById(id).exec();
    return d ? toJotallasDetail(d) : null;
  },

  /** Issues a warranty card; the current legal text is frozen into it, the end dates computed. */
  async createJotallas(
    input: JotallasInput,
    partner: Pick<PartnerPillanatkep, "partnerNev">,
    szereplo: Szereplo,
  ): Promise<{ ok: true; id: string }> {
    await connectDB();
    const sorok = input.sorok.map((s) => {
      const kezdet = new Date(`${s.kezdet}T00:00:00.000Z`);
      return {
        termekNev: s.termekNev,
        arlistaTermekId: s.arlistaTermekId,
        gyariSzam: s.gyariSzam,
        evek: s.evek,
        kezdet,
        vege: evekHozzaad(kezdet, s.evek),
      };
    });
    const azonosito = `JJY-${await nextSequence("bizonylat:jotallas", 6)}`;
    const d = await JotallasiJegy.create({
      azonosito,
      partnerId: input.partnerId,
      partnerNev: partner.partnerNev,
      szamlaszam: input.szamlaszam,
      kiallitasNap: input.kiallitasNap,
      sorok,
      megjegyzes: input.megjegyzes,
      jogiSzoveg: await bizonylatApi.getJotallasiSzoveg(),
      lejarat: jotallasLejarat(sorok),
      ...kezdoAllapot("aktiv", szereplo),
    });
    return { ok: true, id: String(d._id) };
  },

  async changeJotallasAllapot(
    id: string,
    allapot: JotallasTaroltAllapot,
    szereplo: Szereplo,
    megjegyzes?: string,
  ): Promise<Eredmeny> {
    if (!validId(id)) return NEM_TALALHATO("A jótállási jegy");
    await connectDB();
    const d = await JotallasiJegy.findById(id).exec();
    if (!d) return NEM_TALALHATO("A jótállási jegy");
    if (d.archivalt) return fail("Archivált jegy állapota nem módosítható");
    const regi = d.status.key as JotallasTaroltAllapot;
    if (!JOTALLAS_ATMENETEK[regi]?.includes(allapot))
      return fail(
        `A jegy „${JOTALLAS_ALLAPOT_LABELS[regi]}” állapotból nem állítható „${JOTALLAS_ALLAPOT_LABELS[allapot]}” állapotba`,
        "ervenytelen_atmenet",
      );
    const entry = {
      key: allapot,
      changedAt: new Date(),
      changedBy: oid(szereplo.id),
      note: megjegyzes,
    };
    const res = await JotallasiJegy.updateOne(
      { _id: d._id, "status.key": regi },
      { $set: { status: entry }, $push: { statusHistory: entry } },
    ).exec();
    return res.matchedCount === 0
      ? fail("A jegy állapota közben megváltozott", "ervenytelen_atmenet")
      : { ok: true };
  },

  archivJotallas: (id: string, ok: string, szereplo: Szereplo) =>
    archivalas(JotallasiJegy, id, ok, szereplo, {}, "A jótállási jegy"),
  restoreJotallas: (id: string) => visszaallitas(JotallasiJegy, id, "A jótállási jegy"),

  // ── Teendők ──────────────────────────────────────────────────────────────────

  /** Certificates awaiting the customer's signature and overdue invoices of the user. */
  /**
   * Global search: a few hits per entity type, gated on the viewer's read permissions (checked
   * before any query). Terms shorter than 2 characters return nothing.
   */
  async search(query: string, viewer: SearchViewer): Promise<SearchHit[]> {
    const term = query.trim();
    if (term.length < 2) return [];
    const sq = {
      page: 1,
      pageSize: SEARCH_PER_TYPE,
      search: term,
      filters: {},
    } as unknown as DataTableQuery;
    const out: SearchHit[] = [];
    if (viewer.permissions.includes("bizonylat:szallitolevel:read")) {
      const { data } = await bizonylatApi.listSzallitolevelek(sq);
      for (const s of data)
        out.push({
          module: "bizonylat",
          entityLabel: "Szállítólevél",
          entityId: s._id,
          title: s.azonosito,
          subtitle: s.partnerNev,
          url: `/bizonylat/szallitolevelek/${s._id}`,
        });
    }
    if (viewer.permissions.includes("bizonylat:igazolas:read")) {
      const { data } = await bizonylatApi.listIgazolasok(sq, {
        kind: "staff",
        userId: viewer.userId,
      });
      for (const i of data)
        out.push({
          module: "bizonylat",
          entityLabel: "Teljesítésigazolás",
          entityId: i._id,
          title: `${i.azonosito} · ${i.cim}`,
          subtitle: i.partnerNev,
          url: `/bizonylat/igazolasok/${i._id}`,
        });
    }
    if (viewer.permissions.includes("bizonylat:szamla:read")) {
      const { data } = await bizonylatApi.listSzamlak(sq);
      for (const s of data)
        out.push({
          module: "bizonylat",
          entityLabel: "Számla",
          entityId: s._id,
          title: s.szamlaszam ? `${s.azonosito} · ${s.szamlaszam}` : s.azonosito,
          subtitle: s.partnerNev,
          url: `/bizonylat/szamlak/${s._id}`,
        });
    }
    return out;
  },

  /** Latest status changes (newest first) — feeds the dashboard's activity panel. */
  async getTevekenyseg(limit = 8): Promise<ActivityRef[]> {
    await connectDB();
    const rows = await Szamla.find({
      archivalt: { $ne: true },
      "status.changedAt": { $exists: true },
    })
      .sort({ "status.changedAt": -1 })
      .limit(limit)
      .lean()
      .exec();
    return rows.map((d) => ({
      module: "bizonylat",
      entityType: "szamla",
      entityId: String(d._id),
      title: `${d.azonosito} · ${d.partnerNev}`,
      statusLabel:
        SZAMLA_ALLAPOT_LABELS[d.status.key as keyof typeof SZAMLA_ALLAPOT_LABELS] ??
        d.status.key,
      changedAt: d.status.changedAt.toISOString(),
      changedBy: String(d.status.changedBy),
      url: `/bizonylat/szamlak/${d._id}`,
    }));
  },

  async listMyAssignments(userId: string): Promise<TaskRef[]> {
    if (!validId(userId)) return [];
    await connectDB();
    const now = new Date();
    const [igazolasok, szamlak] = await Promise.all([
      Teljesitesigazolas.find({
        "assignee.userId": oid(userId),
        "status.key": "elkuldve",
        archivalt: { $ne: true },
      })
        .select("azonosito cim partnerNev tokenLejar")
        .lean<ITeljesitesigazolas[]>()
        .exec(),
      Szamla.find({
        "assignee.userId": oid(userId),
        "status.key": "elkuldve",
        esedekes: { $lt: now },
        archivalt: { $ne: true },
      })
        .select("azonosito szamlaszam partnerNev esedekes")
        .lean<ISzamla[]>()
        .exec(),
    ]);
    return [
      ...igazolasok.map((i) => ({
        module: "bizonylat",
        entityType: "igazolas",
        entityId: String(i._id),
        title: `${i.azonosito} · ${i.cim}`,
        status: "Aláírásra vár",
        url: `/bizonylat/igazolasok/${i._id}`,
        dueDate: i.tokenLejar?.toISOString(),
        contextLabel: i.partnerNev,
      })),
      ...szamlak.map((s) => ({
        module: "bizonylat",
        entityType: "szamla",
        entityId: String(s._id),
        title: `${s.szamlaszam ?? s.azonosito} · lejárt számla`,
        status: SZAMLA_ALLAPOT_LABELS.lejart,
        url: `/bizonylat/szamlak/${s._id}`,
        dueDate: s.esedekes?.toISOString(),
        contextLabel: s.partnerNev,
      })),
    ];
  },
} as const;
