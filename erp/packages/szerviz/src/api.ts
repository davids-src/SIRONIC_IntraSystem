/**
 * Szerviz facade (hibajegy, munkalap, karbantartási terv). No permission checks here — Server
 * Actions do that. Production Mongo is a standalone without transactions: every change is one
 * conditional atomic update (the expected state is part of the filter; `matchedCount === 0`
 * means someone else won the race), and the stock side effect of a worklog goes through the
 * `KeszletKiadasPort`, idempotent on the worklog reference.
 *
 * Reads take a `Nezo` (viewer). A portal viewer is structurally limited — see `szabalyok.ts`.
 */
import { Types } from "mongoose";
import { connectDB, nextSequence, User } from "@erp/db-core";
import { buildDataTableMongoQuery } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import {
  SEARCH_PER_TYPE,
  type SearchHit,
  type SearchViewer,
  type ActivityRef,
  type TaskRef,
} from "@erp/core";
import { Hibajegy, type IHibajegy } from "./models/Hibajegy";
import { Munkalap, type IMunkalap } from "./models/Munkalap";
import { KarbantartasiTerv, type IKarbantartasiTerv } from "./models/KarbantartasiTerv";
import {
  HIBAJEGY_ALLAPOT_LABELS,
  HIBAJEGY_ATMENETEK,
  HIBAJEGY_NYITOTT_ALLAPOTOK,
  KARBANTARTAS_ALLAPOT_LABELS,
  NemSzerkeszthetoError,
  assertSzerkesztheto,
  type HibajegyAllapot,
  type HibajegyPrioritas,
  type Nezo,
  type NezoPortal,
  type NezoStaff,
  type Szereplo,
} from "./constants";
import {
  HIBAJEGY_LIST_COLUMNS,
  KARBANTARTAS_LIST_COLUMNS,
  MUNKALAP_LIST_COLUMNS,
} from "./columns";
import {
  hibajegyNezoSzuro,
  isPortal,
  karbantartasAllapot,
  keszletKiadasTerv,
  kovetkezoEsedekes,
  munkalapNezoSzuro,
  munkalapOsszesites,
  napStr,
  napokHatra,
  napKezdet,
  type TervIdoadat,
} from "./szabalyok";
import type {
  Eredmeny,
  EsedekesTerv,
  HibajegyDetail,
  HibajegyListItem,
  HibajegyOsszegzes,
  HibajegyPortalNezet,
  KarbantartasDetail,
  KarbantartasListItem,
  KeszletKiadasPort,
  KeszletKiadasTerv,
  MunkalapDetail,
  MunkalapListItem,
  MunkalapOsszesito,
  MunkalapPortalNezet,
  MunkalapSor,
  PartnerPillanatkep,
} from "./types";
import type {
  HibajegyAllapotInput,
  HibajegyInput,
  HibajegyPortalInput,
  KarbantartasInput,
  MegjegyzesInput,
  MunkalapInput,
  MunkalapSorInput,
} from "./validation";
import {
  hibajegyAllapotSchema,
  hibajegyPortalSchema,
  hibajegySchema,
  karbantartasSchema,
  megjegyzesSchema,
  munkalapSchema,
  archivalasSchema,
} from "./validation";

// ── Helpers ────────────────────────────────────────────────────────────────────

const oid = (id: string) => new Types.ObjectId(id);
const validId = (id: string) => Types.ObjectId.isValid(id);
const iso = (d?: Date | null) => (d ? d.toISOString() : undefined);
const fail = (message: string, code?: "nem_szerkesztheto" | "ervenytelen_atmenet") =>
  ({ ok: false, message, code }) as const;
const elsoHiba = (issues: Array<{ message: string }>) =>
  issues[0]?.message ?? "Érvénytelen adatok.";
const userNev = (u: { name?: string | null; email?: string } | undefined) =>
  u?.name || u?.email || "Ismeretlen";
const dupKey = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

export type ListaOpciok = { archivaltakkal?: boolean };

function archivSzuro(filter: Record<string, unknown>, archivaltakkal?: boolean) {
  if (archivaltakkal) return filter;
  const and = Array.isArray(filter.$and) ? (filter.$and as unknown[]) : [];
  return { ...filter, $and: [...and, { archivalt: { $ne: true } }] };
}

const archivSet = (okText: string, szereplo: Szereplo) => ({
  $set: {
    archivalt: true,
    archivalasOka: okText,
    archivalasIdopont: new Date(),
    archivaltaId: szereplo.id,
  },
});
const visszaallitUpdate = {
  $set: { archivalt: false },
  $unset: { archivalasOka: "", archivalasIdopont: "", archivaltaId: "" },
};

function statusEntry(key: string, szereplo: Szereplo, note?: string) {
  return {
    key,
    changedAt: new Date(),
    changedBy: oid(szereplo.id),
    ...(note ? { note } : {}),
  };
}

async function felelosAdatok(felelosId?: string) {
  if (!felelosId) return { userId: undefined, felelosNev: undefined };
  if (!validId(felelosId)) return null;
  const u = await User.findById(felelosId).select("name email isActive").lean().exec();
  if (!u || u.isActive === false) return null;
  return { userId: felelosId, felelosNev: userNev(u) };
}

function szerkesztesVedett(fn: () => Promise<Eredmeny>): Promise<Eredmeny> {
  return fn().catch((e: unknown) => {
    if (e instanceof NemSzerkeszthetoError) return fail(e.message, "nem_szerkesztheto");
    throw e;
  });
}

// ── Mapping: Hibajegy ──────────────────────────────────────────────────────────

function hibajegyListItem(d: IHibajegy): HibajegyListItem {
  return {
    _id: String(d._id),
    azonosito: d.azonosito,
    targy: d.targy,
    partnerNev: d.partnerNev,
    felelosNev: d.felelosNev,
    allapot: d.status.key as HibajegyAllapot,
    prioritas: d.prioritas,
    forras: d.forras,
    kategoria: d.kategoria,
    archivalt: d.archivalt,
    createdAt: d.createdAt.toISOString(),
  };
}

function hibajegyDetail(d: IHibajegy, belsoLathato: boolean): HibajegyDetail {
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    partnerId: d.partnerId,
    partnerNev: d.partnerNev,
    egyszeriNev: d.egyszeriNev,
    egyszeriTelefon: d.egyszeriTelefon,
    projektId: d.projektId,
    forras: d.forras,
    prioritas: d.prioritas,
    allapot: d.status.key as HibajegyAllapot,
    kategoria: d.kategoria,
    targy: d.targy,
    leiras: d.leiras,
    helyszin: d.helyszin,
    erintettTetelek: d.erintettTetelek,
    megoldasJegyzet: d.megoldasJegyzet,
    megoldva: iso(d.megoldva),
    felelosId: d.assignee?.userId ? String(d.assignee.userId) : undefined,
    felelosNev: d.felelosNev,
    // Sensitive cut in the facade: internal data needs `szerviz:hibajegy:belso`.
    belsoJegyzet: belsoLathato ? d.belsoJegyzet : undefined,
    megjegyzesek: d.megjegyzesek
      .filter((m) => belsoLathato || !m.belso)
      .map((m) => ({
        id: String(m._id),
        szerzoNev: m.szerzoNev,
        szerepkor: m.szerepkor,
        uzenet: m.uzenet,
        belso: m.belso,
        letrehozva: m.letrehozva.toISOString(),
      })),
    elozmenyek: d.statusHistory.map((e) => ({
      allapot: e.key as HibajegyAllapot,
      idopont: e.changedAt.toISOString(),
      megjegyzes: e.note,
    })),
    karbantartasiTervId: d.karbantartasiTervId,
    archivalt: d.archivalt,
    archivalasOka: d.archivalasOka,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/** Allow-list projection — a new internal field can never leak by being forgotten here. */
function hibajegyPortal(d: IHibajegy): HibajegyPortalNezet {
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    targy: d.targy,
    leiras: d.leiras,
    allapot: d.status.key as HibajegyAllapot,
    prioritas: d.prioritas,
    kategoria: d.kategoria,
    helyszin: d.helyszin,
    erintettTetelek: d.erintettTetelek,
    megoldasJegyzet: d.megoldasJegyzet,
    megjegyzesek: d.megjegyzesek
      .filter((m) => !m.belso)
      .map((m) => ({
        id: String(m._id),
        szerepkor: m.szerepkor,
        szerzoNev: m.szerepkor === "partner" ? m.szerzoNev : undefined,
        uzenet: m.uzenet,
        letrehozva: m.letrehozva.toISOString(),
      })),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

// ── Mapping: Munkalap ──────────────────────────────────────────────────────────

/** Lines from the form → stored lines: a snapshot's frozen price always wins over the client's. */
export function munkalapSorokNormalizalasa(sorok: MunkalapSorInput[]): MunkalapSor[] {
  return sorok.map((s) => {
    const sor: MunkalapSor = {
      tipus: s.tipus,
      forras: s.forras,
      leiras: s.leiras,
      mennyiseg: s.mennyiseg,
      egyseg: s.egyseg,
      nettoEgysegar: s.nettoEgysegar,
      keszletbolKiad: s.keszletbolKiad,
    };
    if (s.arSnapshot) {
      sor.arSnapshot = s.arSnapshot;
      sor.nettoEgysegar = s.arSnapshot.vegAr;
      sor.arlistaTetelId = s.arSnapshot.tetelId;
    } else if (s.arlistaTetelId) sor.arlistaTetelId = s.arlistaTetelId;
    return sor;
  });
}

function munkalapSorok(d: IMunkalap): MunkalapSor[] {
  return (d.toObject() as { sorok: MunkalapSor[] }).sorok;
}

function munkalapListItem(d: IMunkalap): MunkalapListItem {
  return {
    _id: String(d._id),
    azonosito: d.azonosito,
    partnerNev: d.partnerNev ?? d.egyszeriNev,
    szerelo: d.szerelo,
    munkaDatum: d.munkaDatum.toISOString(),
    kategoria: d.kategoria,
    allapot: d.status.key as MunkalapListItem["allapot"],
    munkaOra: munkalapOsszesites(d.sorok).munkaOra,
    keszletKiadva: d.keszletKiadva,
    archivalt: d.archivalt,
    createdAt: d.createdAt.toISOString(),
  };
}

function munkalapDetail(d: IMunkalap): MunkalapDetail {
  const sorok = munkalapSorok(d);
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    partnerId: d.partnerId,
    partnerNev: d.partnerNev,
    egyszeriNev: d.egyszeriNev,
    egyszeriTelefon: d.egyszeriTelefon,
    projektId: d.projektId,
    hibajegyId: d.hibajegyId,
    allapot: d.status.key as MunkalapDetail["allapot"],
    munkaDatum: d.munkaDatum.toISOString(),
    munkaKezdet: d.munkaKezdet,
    munkaVege: d.munkaVege,
    szerelo: d.szerelo,
    szereloAlairas: d.szereloAlairas,
    ugyfelNev: d.ugyfelNev,
    ugyfelAlairas: d.ugyfelAlairas,
    helyszin: d.helyszin,
    kategoria: d.kategoria,
    leiras: d.leiras,
    sorok,
    utazasKm: d.utazasKm,
    megjegyzes: d.megjegyzes,
    osszegzes: munkalapOsszesites(sorok),
    keszletKiadva: d.keszletKiadva,
    keszletKiadas: d.keszletKiadas
      ? {
          ok: d.keszletKiadas.ok,
          idopont: d.keszletKiadas.idopont.toISOString(),
          uzenet: d.keszletKiadas.uzenet,
        }
      : undefined,
    lezarva: iso(d.lezarva),
    archivalt: d.archivalt,
    archivalasOka: d.archivalasOka,
    createdAt: d.createdAt.toISOString(),
  };
}

function munkalapPortal(d: IMunkalap): MunkalapPortalNezet {
  const sorok = munkalapSorok(d);
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    munkaDatum: d.munkaDatum.toISOString(),
    szerelo: d.szerelo,
    helyszin: d.helyszin,
    kategoria: d.kategoria,
    leiras: d.leiras,
    sorok: sorok.map(({ tipus, leiras, mennyiseg, egyseg }) => ({
      tipus,
      leiras,
      mennyiseg,
      egyseg,
    })),
    munkaOra: munkalapOsszesites(sorok).munkaOra,
    lezarva: iso(d.lezarva),
  };
}

// ── Mapping: Karbantartási terv ────────────────────────────────────────────────

const tervIdo = (d: IKarbantartasiTerv): TervIdoadat => ({
  elsoEsedekes: d.elsoEsedekes,
  intervallumHonap: d.intervallumHonap,
  utolsoCiklus: d.utolsoCiklus,
  elorejelzesNap: d.elorejelzesNap,
  aktiv: d.aktiv,
});

function karbantartasListItem(d: IKarbantartasiTerv, ma: Date): KarbantartasListItem {
  const t = tervIdo(d);
  return {
    _id: String(d._id),
    cim: d.cim,
    partnerNev: d.partnerNev,
    intervallumHonap: d.intervallumHonap,
    prioritas: d.prioritas,
    felelosNev: d.felelosNev,
    aktiv: d.aktiv,
    kovetkezoEsedekes: napStr(kovetkezoEsedekes(t)),
    allapot: karbantartasAllapot(t, ma),
    archivalt: d.archivalt,
    createdAt: d.createdAt.toISOString(),
  };
}

function karbantartasDetail(d: IKarbantartasiTerv, ma: Date): KarbantartasDetail {
  const t = tervIdo(d);
  return {
    id: String(d._id),
    cim: d.cim,
    partnerId: d.partnerId,
    partnerNev: d.partnerNev,
    projektId: d.projektId,
    intervallumHonap: d.intervallumHonap,
    elsoEsedekes: napStr(d.elsoEsedekes),
    utolsoCiklus: d.utolsoCiklus,
    kovetkezoEsedekes: napStr(kovetkezoEsedekes(t)),
    elorejelzesNap: d.elorejelzesNap,
    aktiv: d.aktiv,
    allapot: karbantartasAllapot(t, ma),
    sablonLeiras: d.sablonLeiras,
    kategoria: d.kategoria,
    prioritas: d.prioritas,
    felelosId: d.felelosId,
    felelosNev: d.felelosNev,
    archivalt: d.archivalt,
    archivalasOka: d.archivalasOka,
  };
}

// ── Hibajegy facade ────────────────────────────────────────────────────────────

const HIBAJEGY_NEM_TALALHATO = "A hibajegy nem található";

function getHibajegy(id: string, nezo: NezoStaff): Promise<HibajegyDetail | null>;
function getHibajegy(id: string, nezo: NezoPortal): Promise<HibajegyPortalNezet | null>;
function getHibajegy(
  id: string,
  nezo: Nezo,
): Promise<HibajegyDetail | HibajegyPortalNezet | null>;
async function getHibajegy(
  id: string,
  nezo: Nezo,
): Promise<HibajegyDetail | HibajegyPortalNezet | null> {
  if (!validId(id)) return null;
  await connectDB();
  const d = await Hibajegy.findOne({ _id: id, ...hibajegyNezoSzuro(nezo) }).exec();
  if (!d) return null;
  return isPortal(nezo)
    ? hibajegyPortal(d)
    : hibajegyDetail(d, nezo.belsoLathato === true);
}

function hibajegyAlapMezok(d: {
  targy: string;
  leiras: string;
  kategoria: string;
  prioritas: HibajegyPrioritas;
  helyszin?: string;
  erintettTetelek?: string;
}) {
  return {
    targy: d.targy,
    leiras: d.leiras,
    kategoria: d.kategoria,
    prioritas: d.prioritas,
    helyszin: d.helyszin,
    erintettTetelek: d.erintettTetelek,
  };
}

const hibajegyFacade = {
  getHibajegy,

  async listHibajegyek(
    query: DataTableQuery,
    nezo: Nezo,
    opciok: ListaOpciok = {},
  ): Promise<{ data: HibajegyListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      HIBAJEGY_LIST_COLUMNS,
    );
    const teljes = archivSzuro(
      { $and: [filter, hibajegyNezoSzuro(nezo)] },
      !isPortal(nezo) && opciok.archivaltakkal,
    );
    const [rows, total] = await Promise.all([
      Hibajegy.find(teljes).sort(sort).skip(skip).limit(limit).exec(),
      Hibajegy.countDocuments(teljes).exec(),
    ]);
    const data = rows.map((r) => {
      const item = hibajegyListItem(r);
      // Staff identities are internal.
      return isPortal(nezo) ? { ...item, felelosNev: undefined } : item;
    });
    return { data, total };
  },

  async getOsszegzes(): Promise<HibajegyOsszegzes> {
    await connectDB();
    const rows = await Hibajegy.aggregate<{ _id: string; n: number }>([
      { $match: { archivalt: { $ne: true } } },
      { $group: { _id: "$status.key", n: { $sum: 1 } } },
    ]).exec();
    const n = (k: HibajegyAllapot) => rows.find((r) => r._id === k)?.n ?? 0;
    const kritikus = await Hibajegy.countDocuments({
      archivalt: { $ne: true },
      "status.key": { $in: [...HIBAJEGY_NYITOTT_ALLAPOTOK] },
      prioritas: "kritikus",
    }).exec();
    return {
      nyitott: n("uj") + n("folyamatban") + n("varakozik"),
      uj: n("uj"),
      varakozik: n("varakozik"),
      kritikus,
      megoldva: n("megoldva"),
    };
  },

  /** Staff create. A partner (snapshot supplied by the app) or a one-time contact is required. */
  async createHibajegy(
    input: HibajegyInput,
    partner: PartnerPillanatkep | undefined,
    szereplo: Szereplo,
  ): Promise<Eredmeny<{ id: string }>> {
    const p = hibajegySchema.safeParse(input);
    if (!p.success) return fail(elsoHiba(p.error.issues));
    const d = p.data;
    if (d.partnerId && !partner) return fail("A partner nem található");
    if (!d.partnerId && !d.egyszeriNev)
      return fail("Add meg a partnert vagy az egyszeri ügyfél nevét");
    await connectDB();
    const felelos = await felelosAdatok(d.felelosId);
    if (!felelos) return fail("A felelős nem található vagy inaktív.");
    const azonosito = `TK-${await nextSequence("szerviz:hibajegy", 6)}`;
    const entry = statusEntry("uj", szereplo);
    const doc = await Hibajegy.create({
      ...hibajegyAlapMezok(d),
      azonosito,
      partnerId: d.partnerId,
      partnerNev: d.partnerId ? partner?.partnerNev : undefined,
      egyszeriNev: d.egyszeriNev,
      egyszeriTelefon: d.egyszeriTelefon,
      projektId: d.projektId,
      belsoJegyzet: d.belsoJegyzet,
      forras: d.forras,
      letrehozoId: szereplo.id,
      status: entry,
      statusHistory: [entry],
      assignee: felelos.userId
        ? {
            userId: oid(felelos.userId),
            assignedAt: new Date(),
            assignedBy: oid(szereplo.id),
          }
        : null,
      felelosNev: felelos.felelosNev,
      notes: [],
    });
    return { ok: true, id: String(doc._id) };
  },

  /**
   * Portal create. The partner comes from the VIEWER, never from the input; the source is
   * `portal`, nobody is assigned and no internal data can be supplied.
   */
  async createHibajegyPortal(
    input: HibajegyPortalInput,
    nezo: NezoPortal,
    partner: PartnerPillanatkep,
    szereplo: Szereplo,
  ): Promise<Eredmeny<{ id: string }>> {
    if (!nezo.partnerId) return fail("A partner nem azonosítható");
    const p = hibajegyPortalSchema.safeParse(input);
    if (!p.success) return fail(elsoHiba(p.error.issues));
    await connectDB();
    const azonosito = `TK-${await nextSequence("szerviz:hibajegy", 6)}`;
    const entry = statusEntry("uj", szereplo);
    const doc = await Hibajegy.create({
      ...hibajegyAlapMezok(p.data),
      azonosito,
      partnerId: nezo.partnerId,
      partnerNev: partner.partnerNev,
      forras: "portal",
      letrehozoId: szereplo.id,
      status: entry,
      statusHistory: [entry],
      assignee: null,
      notes: [],
    });
    return { ok: true, id: String(doc._id) };
  },

  /** Master data only — state changes through `setHibajegyAllapot`, the assignee through `setFelelos`. */
  async updateHibajegy(
    id: string,
    input: HibajegyInput,
    partner: PartnerPillanatkep | undefined,
  ): Promise<Eredmeny> {
    const p = hibajegySchema.safeParse(input);
    if (!p.success) return fail(elsoHiba(p.error.issues));
    if (!validId(id)) return fail(HIBAJEGY_NEM_TALALHATO);
    const d = p.data;
    await connectDB();
    const regi = await Hibajegy.findById(id)
      .select("archivalt partnerId partnerNev forras")
      .lean()
      .exec();
    if (!regi) return fail(HIBAJEGY_NEM_TALALHATO);
    if (regi.archivalt) return fail("Az archivált hibajegy nem módosítható.");
    if (!d.partnerId && !d.egyszeriNev)
      return fail("Add meg a partnert vagy az egyszeri ügyfél nevét");
    const partnerNev =
      d.partnerId === regi.partnerId
        ? (partner?.partnerNev ?? regi.partnerNev)
        : partner?.partnerNev;
    if (d.partnerId && !partnerNev) return fail("A partner nem található");
    const opc: Record<string, unknown> = {
      partnerId: d.partnerId,
      partnerNev: d.partnerId ? partnerNev : undefined,
      egyszeriNev: d.egyszeriNev,
      egyszeriTelefon: d.egyszeriTelefon,
      projektId: d.projektId,
      helyszin: d.helyszin,
      erintettTetelek: d.erintettTetelek,
      belsoJegyzet: d.belsoJegyzet,
    };
    const set: Record<string, unknown> = {
      targy: d.targy,
      leiras: d.leiras,
      kategoria: d.kategoria,
      prioritas: d.prioritas,
      // The portal source is a fact about the origin and is never rewritten.
      ...(regi.forras === "portal" ? {} : { forras: d.forras }),
    };
    const unset: Record<string, ""> = {};
    for (const [k, v] of Object.entries(opc)) {
      if (v !== undefined) set[k] = v;
      else unset[k] = "";
    }
    const res = await Hibajegy.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      { $set: set, $unset: unset },
    ).exec();
    return res.matchedCount === 0
      ? fail("A hibajegy időközben archiválva lett.")
      : { ok: true };
  },

  /** Guarded transition; the expected current state is part of the filter. */
  async setHibajegyAllapot(
    id: string,
    input: HibajegyAllapotInput,
    szereplo: Szereplo,
  ): Promise<Eredmeny> {
    const p = hibajegyAllapotSchema.safeParse(input);
    if (!p.success) return fail(elsoHiba(p.error.issues));
    if (!validId(id)) return fail(HIBAJEGY_NEM_TALALHATO);
    await connectDB();
    const doc = await Hibajegy.findById(id).select("status archivalt").lean().exec();
    if (!doc) return fail(HIBAJEGY_NEM_TALALHATO);
    if (doc.archivalt) return fail("Az archivált hibajegy nem módosítható.");
    const from = doc.status.key as HibajegyAllapot;
    const to = p.data.allapot;
    if (!HIBAJEGY_ATMENETEK[from].includes(to))
      return fail(
        `„${HIBAJEGY_ALLAPOT_LABELS[from]}” hibajegy nem állítható „${HIBAJEGY_ALLAPOT_LABELS[to]}” állapotra.`,
        "ervenytelen_atmenet",
      );
    const entry = statusEntry(to, szereplo, p.data.megjegyzes);
    const set: Record<string, unknown> = { status: entry };
    const unset: Record<string, ""> = {};
    if (to === "megoldva") {
      set.megoldva = entry.changedAt;
      if (p.data.megoldasJegyzet) set.megoldasJegyzet = p.data.megoldasJegyzet;
    } else if (to === "folyamatban") unset.megoldva = "";
    const res = await Hibajegy.updateOne(
      { _id: oid(id), "status.key": from, archivalt: { $ne: true } },
      {
        $set: set,
        $push: { statusHistory: entry },
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
      },
    ).exec();
    return res.matchedCount === 0
      ? fail(
          "A hibajegy állapota időközben megváltozott — frissítsd az oldalt.",
          "ervenytelen_atmenet",
        )
      : { ok: true };
  },

  async setFelelos(
    id: string,
    felelosId: string | undefined,
    szereplo: Szereplo,
  ): Promise<Eredmeny> {
    if (!validId(id)) return fail(HIBAJEGY_NEM_TALALHATO);
    await connectDB();
    const felelos = await felelosAdatok(felelosId);
    if (!felelos) return fail("A felelős nem található vagy inaktív.");
    const update = felelos.userId
      ? {
          $set: {
            assignee: {
              userId: oid(felelos.userId),
              assignedAt: new Date(),
              assignedBy: oid(szereplo.id),
            },
            felelosNev: felelos.felelosNev,
          },
        }
      : { $set: { assignee: null }, $unset: { felelosNev: "" } };
    const res = await Hibajegy.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      update,
    ).exec();
    return res.matchedCount === 0
      ? fail(`${HIBAJEGY_NEM_TALALHATO} vagy archivált`)
      : { ok: true };
  },

  /**
   * Adds a comment. The viewer decides what is allowed: a portal viewer can only add a
   * non-internal comment to a ticket of its own partner (never to a closed one); a staff viewer
   * needs `belsoLathato` to write an internal one.
   */
  async addMegjegyzes(
    id: string,
    input: MegjegyzesInput,
    szereplo: Szereplo,
    nezo: Nezo,
  ): Promise<Eredmeny> {
    const p = megjegyzesSchema.safeParse(input);
    if (!p.success) return fail(elsoHiba(p.error.issues));
    if (!validId(id)) return fail(HIBAJEGY_NEM_TALALHATO);
    const portal = isPortal(nezo);
    if (!portal && p.data.belso && nezo.belsoLathato !== true)
      return fail("Belső megjegyzés írásához nincs jogosultságod.");
    await connectDB();
    const res = await Hibajegy.updateOne(
      {
        _id: oid(id),
        ...hibajegyNezoSzuro(nezo),
        archivalt: { $ne: true },
        ...(portal ? { "status.key": { $ne: "lezart" } } : {}),
      },
      {
        $push: {
          megjegyzesek: {
            szerzoId: szereplo.id,
            szerzoNev: szereplo.nev,
            szerepkor: portal ? "partner" : "munkatars",
            uzenet: p.data.uzenet,
            belso: portal ? false : p.data.belso,
            letrehozva: new Date(),
          },
        },
      },
    ).exec();
    return res.matchedCount === 0
      ? fail(`${HIBAJEGY_NEM_TALALHATO} vagy már lezárt`)
      : { ok: true };
  },

  async archivHibajegy(
    id: string,
    okText: string,
    szereplo: Szereplo,
  ): Promise<Eredmeny> {
    const p = archivalasSchema.safeParse({ ok: okText });
    if (!p.success) return fail(elsoHiba(p.error.issues));
    if (!validId(id)) return fail(HIBAJEGY_NEM_TALALHATO);
    await connectDB();
    const res = await Hibajegy.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      archivSet(p.data.ok, szereplo),
    ).exec();
    return res.matchedCount === 0
      ? fail(`${HIBAJEGY_NEM_TALALHATO} vagy már archivált`)
      : { ok: true };
  },

  async restoreHibajegy(id: string): Promise<Eredmeny> {
    if (!validId(id)) return fail(HIBAJEGY_NEM_TALALHATO);
    await connectDB();
    const res = await Hibajegy.updateOne(
      { _id: oid(id), archivalt: true },
      visszaallitUpdate,
    ).exec();
    return res.matchedCount === 0
      ? fail(`${HIBAJEGY_NEM_TALALHATO} vagy nem archivált`)
      : { ok: true };
  },

  /** Active tickets for dropdowns (worklog link). */
  async listHibajegyOpciok(): Promise<
    Array<{ id: string; azonosito: string; targy: string }>
  > {
    await connectDB();
    const rows = await Hibajegy.find({
      archivalt: { $ne: true },
      "status.key": { $ne: "lezart" },
    })
      .select("azonosito targy")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean()
      .exec();
    return rows.map((r) => ({
      id: String(r._id),
      azonosito: r.azonosito,
      targy: r.targy,
    }));
  },
};

// ── Munkalap facade ────────────────────────────────────────────────────────────

const MUNKALAP_NEM_TALALHATO = "A munkalap nem található";

function getMunkalap(id: string, nezo: NezoStaff): Promise<MunkalapDetail | null>;
function getMunkalap(id: string, nezo: NezoPortal): Promise<MunkalapPortalNezet | null>;
function getMunkalap(
  id: string,
  nezo: Nezo,
): Promise<MunkalapDetail | MunkalapPortalNezet | null>;
async function getMunkalap(
  id: string,
  nezo: Nezo,
): Promise<MunkalapDetail | MunkalapPortalNezet | null> {
  if (!validId(id)) return null;
  await connectDB();
  const d = await Munkalap.findOne({ _id: id, ...munkalapNezoSzuro(nezo) }).exec();
  if (!d) return null;
  return isPortal(nezo) ? munkalapPortal(d) : munkalapDetail(d);
}

function munkalapMezok(
  d: MunkalapInput,
  sorok: MunkalapSor[],
  partnerNev: string | undefined,
) {
  const opc: Record<string, unknown> = {
    partnerId: d.partnerId,
    partnerNev: d.partnerId ? partnerNev : undefined,
    egyszeriNev: d.egyszeriNev,
    egyszeriTelefon: d.egyszeriTelefon,
    projektId: d.projektId,
    hibajegyId: d.hibajegyId,
    munkaKezdet: d.munkaKezdet,
    munkaVege: d.munkaVege,
    szereloAlairas: d.szereloAlairas,
    ugyfelNev: d.ugyfelNev,
    ugyfelAlairas: d.ugyfelAlairas,
    helyszin: d.helyszin,
    utazasKm: d.utazasKm,
    megjegyzes: d.megjegyzes,
  };
  const set: Record<string, unknown> = {
    munkaDatum: d.munkaDatum,
    szerelo: d.szerelo,
    kategoria: d.kategoria,
    leiras: d.leiras,
    sorok,
  };
  const unset: Record<string, ""> = {};
  for (const [k, v] of Object.entries(opc)) {
    if (v !== undefined) set[k] = v;
    else unset[k] = "";
  }
  return { set, unset };
}

/** Calls the stock port for the material lines and records the outcome on the worklog. */
async function keszletKiadasFuttat(
  d: IMunkalap,
  terv: KeszletKiadasTerv,
  port: KeszletKiadasPort,
): Promise<{ ok: true; uzenet?: string } | { ok: false; uzenet: string }> {
  let eredmeny: { ok: boolean; uzenet?: string };
  try {
    const r = await port.kiad(terv, {
      tipus: "munkalap",
      id: String(d._id),
      azonosito: d.azonosito,
    });
    eredmeny = r.ok ? { ok: true, uzenet: r.uzenet } : { ok: false, uzenet: r.message };
  } catch (e) {
    eredmeny = { ok: false, uzenet: e instanceof Error ? e.message : "Ismeretlen hiba" };
  }
  await Munkalap.updateOne(
    { _id: d._id },
    {
      $set: {
        keszletKiadva: eredmeny.ok,
        keszletKiadas: { ...eredmeny, idopont: new Date() },
      },
    },
  ).exec();
  return eredmeny.ok
    ? { ok: true, uzenet: eredmeny.uzenet }
    : { ok: false, uzenet: eredmeny.uzenet ?? "" };
}

type LezarEredmeny = Eredmeny<{
  idempotens?: boolean;
  keszletTerv: KeszletKiadasTerv;
  keszletKiadva: boolean;
}>;

const munkalapFacade = {
  getMunkalap,

  async listMunkalapok(
    query: DataTableQuery,
    nezo: Nezo,
    opciok: ListaOpciok = {},
  ): Promise<{ data: MunkalapListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      MUNKALAP_LIST_COLUMNS,
    );
    const teljes = archivSzuro(
      { $and: [filter, munkalapNezoSzuro(nezo)] },
      !isPortal(nezo) && opciok.archivaltakkal,
    );
    const [rows, total] = await Promise.all([
      Munkalap.find(teljes).sort(sort).skip(skip).limit(limit).exec(),
      Munkalap.countDocuments(teljes).exec(),
    ]);
    return { data: rows.map(munkalapListItem), total };
  },

  async getMunkalapOsszesito(ma: Date = new Date()): Promise<MunkalapOsszesito> {
    await connectDB();
    const honapEleje = new Date(Date.UTC(ma.getUTCFullYear(), ma.getUTCMonth(), 1));
    const [piszkozat, lezartHonap, keszletHibas] = await Promise.all([
      Munkalap.countDocuments({
        archivalt: { $ne: true },
        "status.key": "piszkozat",
      }).exec(),
      Munkalap.countDocuments({
        archivalt: { $ne: true },
        "status.key": "lezart",
        lezarva: { $gte: honapEleje },
      }).exec(),
      Munkalap.countDocuments({
        archivalt: { $ne: true },
        "status.key": "lezart",
        keszletKiadva: false,
        "sorok.keszletbolKiad": true,
      }).exec(),
    ]);
    return { piszkozat, lezartHonap, keszletHibas };
  },

  async createMunkalap(
    input: MunkalapInput,
    partner: PartnerPillanatkep | undefined,
    szereplo: Szereplo,
  ): Promise<Eredmeny<{ id: string }>> {
    const p = munkalapSchema.safeParse(input);
    if (!p.success) return fail(elsoHiba(p.error.issues));
    const d = p.data;
    if (d.partnerId && !partner) return fail("A partner nem található");
    if (!d.partnerId && !d.egyszeriNev)
      return fail("Add meg a partnert vagy az egyszeri ügyfél nevét");
    await connectDB();
    const azonosito = `ML-${await nextSequence("szerviz:munkalap", 6)}`;
    const { set } = munkalapMezok(
      d,
      munkalapSorokNormalizalasa(d.sorok),
      partner?.partnerNev,
    );
    const entry = statusEntry("piszkozat", szereplo);
    const doc = await Munkalap.create({
      ...set,
      azonosito,
      letrehozoId: szereplo.id,
      status: entry,
      statusHistory: [entry],
      assignee: null,
      notes: [],
      keszletKiadva: false,
    });
    return { ok: true, id: String(doc._id) };
  },

  /** Draft-only (state-machine guard, not just UI); the filter re-checks it atomically. */
  async updateMunkalap(
    id: string,
    input: MunkalapInput,
    partner: PartnerPillanatkep | undefined,
  ): Promise<Eredmeny> {
    const p = munkalapSchema.safeParse(input);
    if (!p.success) return fail(elsoHiba(p.error.issues));
    if (!validId(id)) return fail(MUNKALAP_NEM_TALALHATO);
    const d = p.data;
    if (d.partnerId && !partner) return fail("A partner nem található");
    if (!d.partnerId && !d.egyszeriNev)
      return fail("Add meg a partnert vagy az egyszeri ügyfél nevét");
    await connectDB();
    return szerkesztesVedett(async () => {
      const regi = await Munkalap.findById(id).select("status archivalt").lean().exec();
      if (!regi) return fail(MUNKALAP_NEM_TALALHATO);
      if (regi.archivalt) return fail("Archivált munkalap nem szerkeszthető");
      assertSzerkesztheto(regi.status.key);
      const { set, unset } = munkalapMezok(
        d,
        munkalapSorokNormalizalasa(d.sorok),
        partner?.partnerNev,
      );
      const res = await Munkalap.updateOne(
        { _id: oid(id), "status.key": "piszkozat", archivalt: { $ne: true } },
        { $set: set, $unset: unset },
      ).exec();
      if (res.matchedCount === 0)
        return fail(new NemSzerkeszthetoError("lezart").message, "nem_szerkesztheto");
      return { ok: true };
    });
  },

  /** The stock lines a worklog would issue — for the finalize dialog's preflight. */
  async tervezKeszlet(id: string): Promise<KeszletKiadasTerv | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await Munkalap.findById(id).exec();
    return d ? keszletKiadasTerv(munkalapSorok(d)) : null;
  },

  /**
   * Finalizes a draft. Guarded: with a port, availability is checked first and a shortage blocks
   * the finalize. Idempotent: finalizing a finalized worklog succeeds without side effects, and
   * the status flip is one conditional update, so a double click calls the port once. The port
   * outcome is recorded (`keszletKiadva`); a failed issue leaves the worklog finalized but
   * flagged — `ujraKiadKeszlet` retries.
   */
  async lezarMunkalap(
    id: string,
    szereplo: Szereplo,
    port?: KeszletKiadasPort,
  ): Promise<LezarEredmeny> {
    if (!validId(id)) return fail(MUNKALAP_NEM_TALALHATO);
    await connectDB();
    const d = await Munkalap.findById(id).exec();
    if (!d) return fail(MUNKALAP_NEM_TALALHATO);
    if (d.archivalt) return fail("Archivált munkalap nem zárható le");
    const terv = keszletKiadasTerv(munkalapSorok(d));
    if (d.status.key === "lezart")
      return {
        ok: true,
        idempotens: true,
        keszletTerv: terv,
        keszletKiadva: d.keszletKiadva,
      };
    if (d.ugyfelAlairas && !d.ugyfelNev)
      return fail("Aláírás mellé add meg az ügyfél nevét is.");

    if (port && terv.length > 0) {
      const pf = await port.preflight(terv);
      if (!pf.osszesElegendo) {
        const hianyzo = pf.sorok
          .filter((s) => !s.elegendo)
          .map(
            (s) => `${s.nev ?? s.arlistaTermekId} (kért: ${s.kert}, szabad: ${s.szabad})`,
          )
          .join("; ");
        return fail(`Nincs elég készlet: ${hianyzo}`);
      }
    }

    const entry = statusEntry("lezart", szereplo);
    const res = await Munkalap.updateOne(
      { _id: d._id, "status.key": "piszkozat", archivalt: { $ne: true } },
      {
        $set: {
          status: entry,
          lezarva: entry.changedAt,
          keszletKiadva: terv.length === 0,
        },
        $push: { statusHistory: entry },
      },
    ).exec();
    if (res.matchedCount === 0) {
      // Lost a race: if someone else finalized it meanwhile, this call is a no-op success.
      const mostani = await Munkalap.findById(id)
        .select("status keszletKiadva")
        .lean()
        .exec();
      if (mostani?.status.key === "lezart")
        return {
          ok: true,
          idempotens: true,
          keszletTerv: terv,
          keszletKiadva: mostani.keszletKiadva,
        };
      return fail("A munkalap időközben megváltozott — frissítsd az oldalt.");
    }
    if (terv.length === 0) return { ok: true, keszletTerv: terv, keszletKiadva: true };
    if (!port) return { ok: true, keszletTerv: terv, keszletKiadva: false };

    const r = await keszletKiadasFuttat(d, terv, port);
    return r.ok
      ? { ok: true, keszletTerv: terv, keszletKiadva: true }
      : fail(`A munkalap lezárva, de a készletkiadás sikertelen: ${r.uzenet}`);
  },

  /** Calls the stock port for a finalized worklog whose issue has not succeeded yet. */
  async ujraKiadKeszlet(id: string, port: KeszletKiadasPort): Promise<Eredmeny> {
    if (!validId(id)) return fail(MUNKALAP_NEM_TALALHATO);
    await connectDB();
    const d = await Munkalap.findById(id).exec();
    if (!d) return fail(MUNKALAP_NEM_TALALHATO);
    if (d.status.key !== "lezart") return fail("A munkalap nincs lezárva");
    if (d.keszletKiadva) return { ok: true };
    const terv = keszletKiadasTerv(munkalapSorok(d));
    if (terv.length === 0) {
      await Munkalap.updateOne({ _id: d._id }, { $set: { keszletKiadva: true } }).exec();
      return { ok: true };
    }
    const r = await keszletKiadasFuttat(d, terv, port);
    return r.ok ? { ok: true } : fail(`A készletkiadás sikertelen: ${r.uzenet}`);
  },

  async archivMunkalap(
    id: string,
    okText: string,
    szereplo: Szereplo,
  ): Promise<Eredmeny> {
    const p = archivalasSchema.safeParse({ ok: okText });
    if (!p.success) return fail(elsoHiba(p.error.issues));
    if (!validId(id)) return fail(MUNKALAP_NEM_TALALHATO);
    await connectDB();
    // A worklog whose material already left the stock must not vanish from the books.
    const d = await Munkalap.findById(id).exec();
    if (!d) return fail(MUNKALAP_NEM_TALALHATO);
    if (
      d.status.key === "lezart" &&
      d.keszletKiadva &&
      keszletKiadasTerv(munkalapSorok(d)).length > 0
    )
      return fail("A készletet érintő lezárt munkalap nem archiválható.");
    const res = await Munkalap.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      archivSet(p.data.ok, szereplo),
    ).exec();
    return res.matchedCount === 0
      ? fail(`${MUNKALAP_NEM_TALALHATO} vagy már archivált`)
      : { ok: true };
  },

  async restoreMunkalap(id: string): Promise<Eredmeny> {
    if (!validId(id)) return fail(MUNKALAP_NEM_TALALHATO);
    await connectDB();
    const res = await Munkalap.updateOne(
      { _id: oid(id), archivalt: true },
      visszaallitUpdate,
    ).exec();
    return res.matchedCount === 0
      ? fail(`${MUNKALAP_NEM_TALALHATO} vagy nem archivált`)
      : { ok: true };
  },
};

// ── Karbantartási terv facade ──────────────────────────────────────────────────

const TERV_NEM_TALALHATO = "A karbantartási terv nem található";

const karbantartasFacade = {
  async listKarbantartasok(
    query: DataTableQuery,
    opciok: ListaOpciok = {},
    ma: Date = new Date(),
  ): Promise<{ data: KarbantartasListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      KARBANTARTAS_LIST_COLUMNS,
    );
    const teljes = archivSzuro(filter, opciok.archivaltakkal);
    const [rows, total] = await Promise.all([
      KarbantartasiTerv.find(teljes).sort(sort).skip(skip).limit(limit).exec(),
      KarbantartasiTerv.countDocuments(teljes).exec(),
    ]);
    return { data: rows.map((r) => karbantartasListItem(r, ma)), total };
  },

  async getKarbantartas(
    id: string,
    ma: Date = new Date(),
  ): Promise<KarbantartasDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await KarbantartasiTerv.findById(id).exec();
    return d ? karbantartasDetail(d, ma) : null;
  },

  /** Overdue and due-soon active plans, computed now (no cron): soonest first. */
  async listEsedekes(
    ma: Date = new Date(),
  ): Promise<{ keso: EsedekesTerv[]; hamarosan: EsedekesTerv[] }> {
    await connectDB();
    const rows = await KarbantartasiTerv.find({
      archivalt: { $ne: true },
      aktiv: true,
    }).exec();
    const out: EsedekesTerv[] = [];
    for (const d of rows) {
      const t = tervIdo(d);
      const allapot = karbantartasAllapot(t, ma);
      if (allapot !== "lejart" && allapot !== "hamarosan") continue;
      out.push({
        id: String(d._id),
        cim: d.cim,
        partnerNev: d.partnerNev,
        kovetkezoEsedekes: napStr(kovetkezoEsedekes(t)),
        allapot,
        napokHatra: napokHatra(t, ma),
      });
    }
    out.sort((a, b) => a.kovetkezoEsedekes.localeCompare(b.kovetkezoEsedekes));
    return {
      keso: out.filter((e) => e.allapot === "lejart"),
      hamarosan: out.filter((e) => e.allapot === "hamarosan"),
    };
  },

  async createKarbantartas(
    input: KarbantartasInput,
    partner: PartnerPillanatkep | undefined,
    szereplo: Szereplo,
  ): Promise<Eredmeny<{ id: string }>> {
    const p = karbantartasSchema.safeParse(input);
    if (!p.success) return fail(elsoHiba(p.error.issues));
    if (!partner) return fail("A partner nem található");
    await connectDB();
    const felelos = await felelosAdatok(p.data.felelosId);
    if (!felelos) return fail("A felelős nem található vagy inaktív.");
    const doc = await KarbantartasiTerv.create({
      ...p.data,
      elsoEsedekes: napKezdet(p.data.elsoEsedekes),
      partnerNev: partner.partnerNev,
      felelosNev: felelos.felelosNev,
      utolsoCiklus: -1,
      letrehozoId: szereplo.id,
    });
    return { ok: true, id: String(doc._id) };
  },

  async updateKarbantartas(
    id: string,
    input: KarbantartasInput,
    partner: PartnerPillanatkep | undefined,
  ): Promise<Eredmeny> {
    const p = karbantartasSchema.safeParse(input);
    if (!p.success) return fail(elsoHiba(p.error.issues));
    if (!validId(id)) return fail(TERV_NEM_TALALHATO);
    if (!partner) return fail("A partner nem található");
    await connectDB();
    const felelos = await felelosAdatok(p.data.felelosId);
    if (!felelos) return fail("A felelős nem található vagy inaktív.");
    // `utolsoCiklus` is untouched: editing the schedule never regenerates or skips cycles.
    const { felelosId, projektId, sablonLeiras, ...tobbi } = p.data;
    const set: Record<string, unknown> = {
      ...tobbi,
      elsoEsedekes: napKezdet(p.data.elsoEsedekes),
      partnerNev: partner.partnerNev,
    };
    const unset: Record<string, ""> = {};
    for (const [k, v] of Object.entries({ felelosId, projektId, sablonLeiras })) {
      if (v !== undefined) set[k] = v;
      else unset[k] = "";
    }
    if (felelos.felelosNev) set.felelosNev = felelos.felelosNev;
    else unset.felelosNev = "";
    const res = await KarbantartasiTerv.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      { $set: set, $unset: unset },
    ).exec();
    return res.matchedCount === 0
      ? fail(`${TERV_NEM_TALALHATO} vagy archivált`)
      : { ok: true };
  },

  /**
   * Generates the ticket of the next due cycle. Idempotent per (plan, cycle): the ticket has a
   * unique (karbantartasiTervId, ciklus) index, so a double click or a retry after a crash
   * returns the existing ticket and only (re)advances the plan's cycle pointer.
   */
  async generalHibajegy(
    id: string,
    szereplo: Szereplo,
  ): Promise<Eredmeny<{ id: string; ciklus: number; ujLetrejott: boolean }>> {
    if (!validId(id)) return fail(TERV_NEM_TALALHATO);
    await connectDB();
    const terv = await KarbantartasiTerv.findById(id).exec();
    if (!terv) return fail(TERV_NEM_TALALHATO);
    if (terv.archivalt) return fail("Az archivált terv nem használható.");
    if (!terv.aktiv) return fail("Az inaktív tervből nem generálható hibajegy.");
    const ciklus = terv.utolsoCiklus + 1;
    const esedekes = napStr(kovetkezoEsedekes(tervIdo(terv)));

    const meglevo = async () =>
      Hibajegy.findOne({ karbantartasiTervId: String(terv._id), ciklus })
        .select("_id")
        .lean()
        .exec();
    let ticketId: string;
    let ujLetrejott = false;
    const korabbi = await meglevo();
    if (korabbi) ticketId = String(korabbi._id);
    else {
      const felelos = await felelosAdatok(terv.felelosId);
      const entry = statusEntry("uj", szereplo);
      try {
        const azonosito = `TK-${await nextSequence("szerviz:hibajegy", 6)}`;
        const doc = await Hibajegy.create({
          azonosito,
          partnerId: terv.partnerId,
          partnerNev: terv.partnerNev,
          projektId: terv.projektId,
          letrehozoId: szereplo.id,
          forras: "crm",
          prioritas: terv.prioritas,
          kategoria: terv.kategoria,
          targy: `${terv.cim} (${esedekes})`,
          leiras: terv.sablonLeiras || terv.cim,
          karbantartasiTervId: String(terv._id),
          ciklus,
          status: entry,
          statusHistory: [entry],
          assignee: felelos?.userId
            ? {
                userId: oid(felelos.userId),
                assignedAt: new Date(),
                assignedBy: oid(szereplo.id),
              }
            : null,
          felelosNev: felelos?.felelosNev,
          notes: [],
        });
        ticketId = String(doc._id);
        ujLetrejott = true;
      } catch (e) {
        if (!dupKey(e)) throw e;
        const m = await meglevo();
        if (!m) throw e;
        ticketId = String(m._id);
      }
    }
    // Advance the pointer only from the state we read (a concurrent advance is fine).
    await KarbantartasiTerv.updateOne(
      { _id: terv._id, utolsoCiklus: ciklus - 1 },
      { $set: { utolsoCiklus: ciklus } },
    ).exec();
    return { ok: true, id: ticketId, ciklus, ujLetrejott };
  },

  async archivKarbantartas(
    id: string,
    okText: string,
    szereplo: Szereplo,
  ): Promise<Eredmeny> {
    const p = archivalasSchema.safeParse({ ok: okText });
    if (!p.success) return fail(elsoHiba(p.error.issues));
    if (!validId(id)) return fail(TERV_NEM_TALALHATO);
    await connectDB();
    const res = await KarbantartasiTerv.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      archivSet(p.data.ok, szereplo),
    ).exec();
    return res.matchedCount === 0
      ? fail(`${TERV_NEM_TALALHATO} vagy már archivált`)
      : { ok: true };
  },

  async restoreKarbantartas(id: string): Promise<Eredmeny> {
    if (!validId(id)) return fail(TERV_NEM_TALALHATO);
    await connectDB();
    const res = await KarbantartasiTerv.updateOne(
      { _id: oid(id), archivalt: true },
      visszaallitUpdate,
    ).exec();
    return res.matchedCount === 0
      ? fail(`${TERV_NEM_TALALHATO} vagy nem archivált`)
      : { ok: true };
  },
};

// ── Composed facade ────────────────────────────────────────────────────────────

export const szervizApi = {
  ...hibajegyFacade,
  ...munkalapFacade,
  ...karbantartasFacade,

  /** KPI summary of the module overview. */
  async getAttekintes(ma: Date = new Date()) {
    const [hibajegy, munkalap, esedekes] = await Promise.all([
      hibajegyFacade.getOsszegzes(),
      munkalapFacade.getMunkalapOsszesito(ma),
      karbantartasFacade.listEsedekes(ma),
    ]);
    return { hibajegy, munkalap, esedekes };
  },

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
    if (viewer.permissions.includes("szerviz:hibajegy:read")) {
      const { data } = await hibajegyFacade.listHibajegyek(sq, {
        kind: "staff",
        userId: viewer.userId,
      });
      for (const j of data)
        out.push({
          module: "szerviz",
          entityLabel: "Hibajegy",
          entityId: j._id,
          title: `${j.azonosito} · ${j.targy}`,
          url: `/szerviz/hibajegyek/${j._id}`,
        });
    }
    if (viewer.permissions.includes("szerviz:munkalap:read")) {
      const { data } = await munkalapFacade.listMunkalapok(sq, {
        kind: "staff",
        userId: viewer.userId,
      });
      for (const m of data)
        out.push({
          module: "szerviz",
          entityLabel: "Munkalap",
          entityId: m._id,
          title: m.azonosito,
          subtitle: [m.partnerNev, m.szerelo].filter(Boolean).join(" · "),
          url: `/szerviz/munkalapok/${m._id}`,
        });
    }
    return out;
  },

  /** Latest status changes (newest first) — feeds the dashboard's activity panel. */
  async getTevekenyseg(limit = 8): Promise<ActivityRef[]> {
    await connectDB();
    const rows = await Hibajegy.find({
      archivalt: { $ne: true },
      "status.changedAt": { $exists: true },
    })
      .sort({ "status.changedAt": -1 })
      .limit(limit)
      .lean()
      .exec();
    return rows.map((d) => ({
      module: "szerviz",
      entityType: "hibajegy",
      entityId: String(d._id),
      title: `${d.azonosito} · ${d.targy}`,
      statusLabel:
        HIBAJEGY_ALLAPOT_LABELS[d.status.key as keyof typeof HIBAJEGY_ALLAPOT_LABELS] ??
        d.status.key,
      changedAt: d.status.changedAt.toISOString(),
      changedBy: String(d.status.changedBy),
      url: `/szerviz/hibajegyek/${d._id}`,
    }));
  },

  /** Everything the user owes in this module — feeds Teendőim. */
  async listMyAssignments(userId: string, ma: Date = new Date()): Promise<TaskRef[]> {
    if (!validId(userId)) return [];
    await connectDB();
    const [jegyek, piszkozatok, tervek] = await Promise.all([
      Hibajegy.find({
        "assignee.userId": userId,
        "status.key": { $in: [...HIBAJEGY_NYITOTT_ALLAPOTOK] },
        archivalt: { $ne: true },
      })
        .select("azonosito targy status")
        .lean()
        .exec(),
      Munkalap.find({
        letrehozoId: userId,
        "status.key": "piszkozat",
        archivalt: { $ne: true },
      })
        .select("azonosito partnerNev munkaDatum")
        .lean()
        .exec(),
      KarbantartasiTerv.find({
        felelosId: userId,
        aktiv: true,
        archivalt: { $ne: true },
      }).exec(),
    ]);
    const refs: TaskRef[] = [];
    for (const j of jegyek)
      refs.push({
        module: "szerviz",
        entityType: "hibajegy",
        entityId: String(j._id),
        title: `Hibajegy — ${j.azonosito} ${j.targy}`,
        status: HIBAJEGY_ALLAPOT_LABELS[j.status.key as HibajegyAllapot] ?? j.status.key,
        url: `/szerviz/hibajegyek/${j._id}`,
        kind: "task",
      });
    for (const m of piszkozatok)
      refs.push({
        module: "szerviz",
        entityType: "munkalap",
        entityId: String(m._id),
        title: `Munkalap lezárása — ${m.azonosito}${m.partnerNev ? ` (${m.partnerNev})` : ""}`,
        status: "Piszkozat",
        url: `/szerviz/munkalapok/${m._id}`,
        dueDate: napStr(m.munkaDatum),
        kind: "task",
      });
    for (const d of tervek) {
      const t = tervIdo(d);
      const allapot = karbantartasAllapot(t, ma);
      if (allapot !== "lejart" && allapot !== "hamarosan") continue;
      refs.push({
        module: "szerviz",
        entityType: "karbantartasi-terv",
        entityId: String(d._id),
        title: `Karbantartás — ${d.cim}`,
        status: KARBANTARTAS_ALLAPOT_LABELS[allapot],
        url: `/szerviz/karbantartas/${d._id}`,
        dueDate: napStr(kovetkezoEsedekes(t)),
        kind: "task",
      });
    }
    return refs;
  },

  /** Active users for the assignee picker. */
  async listFelhasznalok(): Promise<Array<{ id: string; name: string }>> {
    await connectDB();
    const users = await User.find({ isActive: true })
      .select("name email")
      .sort({ name: 1 })
      .lean()
      .exec();
    return users.map((u) => ({ id: String(u._id), name: userNev(u) }));
  },
};
