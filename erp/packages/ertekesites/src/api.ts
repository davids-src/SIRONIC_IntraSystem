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
import { Ajanlat, type IAjanlat } from "./models/Ajanlat";
import { Megrendelolap, type IMegrendelolap } from "./models/Megrendelolap";
import {
  Szerzodes,
  SzerzodesSablon,
  type ISzerzodes,
  type ISzerzodesSablon,
} from "./models/Szerzodes";
import {
  AJANLAT_ALLAPOTOK,
  AJANLAT_ALLAPOT_LABELS,
  AJANLAT_ATMENETEK,
  AJANLAT_KEZDO_ALLAPOT,
  ERTEKESITES_PERMISSIONS,
  MEGRENDELO_ALLAPOT_LABELS,
  MEGRENDELO_ATMENETEK,
  NemSzerkeszthetoError,
  SZERZODES_ALLAPOT_LABELS,
  SZERZODES_ATMENETEK,
  UTANKOVETES_MUNKANAP,
  assertSzerkesztheto,
  type AjanlatAllapot,
  type ErtekesitesViewer,
  type MegrendeloAllapot,
  type Szereplo,
  type SzerzodesAllapot,
} from "./constants";
import {
  AJANLAT_LIST_COLUMNS,
  MEGRENDELO_LIST_COLUMNS,
  SZERZODES_LIST_COLUMNS,
} from "./columns";
import {
  ajanlatOsszesites,
  megrendeloOsszesites,
  munkanapHozzaad,
  osszegAdat,
  sorokNormalizalasa,
  szerzodesRender,
  kitoltendoValtozok,
} from "./szamitas";
import type {
  AjanlatDetail,
  AjanlatListItem,
  AjanlatSor,
  Eredmeny,
  KeszletBevetelPort,
  MegrendeloDetail,
  MegrendeloListItem,
  MegrendeloSor,
  PartnerPillanatkep,
  SzerzodesDetail,
  SzerzodesListItem,
  SzerzodesSablonDto,
} from "./types";
import type {
  AjanlatAllapotInput,
  AjanlatInput,
  MegrendeloInput,
  SzerzodesAllapotInput,
  SzerzodesInput,
  SzerzodesSablonInput,
  UtankovetesInput,
} from "./validation";

const oid = (id: string) => new Types.ObjectId(id);
const validId = (id: string) => Types.ObjectId.isValid(id);
const iso = (d?: Date | null) => (d ? d.toISOString() : undefined);
const fail = (message: string, code?: "nem_szerkesztheto" | "ervenytelen_atmenet") =>
  ({ ok: false, message, code }) as const;

function archivSzuro(filter: Record<string, unknown>, archivaltakkal?: boolean) {
  if (archivaltakkal) return filter;
  const and = Array.isArray(filter.$and) ? (filter.$and as unknown[]) : [];
  return { ...filter, $and: [...and, { archivalt: { $ne: true } }] };
}
export type ListaOpciok = { archivaltakkal?: boolean };

/** Runs a content edit; a non-draft document yields the typed error as a failed result. */
function szerkesztesVedett(fn: () => Promise<Eredmeny>): Promise<Eredmeny> {
  return fn().catch((e: unknown) => {
    if (e instanceof NemSzerkeszthetoError) return fail(e.message, "nem_szerkesztheto");
    throw e;
  });
}

// ── Mapping ────────────────────────────────────────────────────────────────────

function elozmenyek<T extends string>(
  h: Array<{ key: string; changedAt: Date; note?: string }> | undefined,
): Array<{ allapot: T; idopont: string; megjegyzes?: string }> {
  return (h ?? []).map((e) => ({
    allapot: e.key as T,
    idopont: e.changedAt.toISOString(),
    megjegyzes: e.note,
  }));
}

function toAjanlatDetail(d: IAjanlat, viewer: ErtekesitesViewer): AjanlatDetail {
  const lathatjaKoltseg = viewer.permissions.includes(
    ERTEKESITES_PERMISSIONS.ajanlatWrite,
  );
  const plain = d.toObject() as { sorok: AjanlatSor[] };
  const sorok: AjanlatSor[] = plain.sorok.map((s) => {
    const o: AjanlatSor = { ...s };
    if (!lathatjaKoltseg) {
      // Sensitive cut: internal cost never reaches viewers without the write permission.
      delete o.beszerzesiEgysegar;
      delete o.belsoKoltseg;
      if (o.arSnapshot) o.arSnapshot = { ...o.arSnapshot, belsoAlapar: 0 };
    }
    return o;
  });
  const calc = ajanlatOsszesites(plain.sorok, d.osszegek.globalisKedvezmenySzazalek);
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    cim: d.cim,
    partnerId: d.partnerId,
    partnerNev: d.partnerNev,
    partnerCim: d.partnerCim,
    partnerAdoszam: d.partnerAdoszam,
    allapot: d.status.key as AjanlatAllapot,
    penznem: d.penznem,
    ervenyesseg: iso(d.ervenyesseg),
    megjegyzes: d.megjegyzes,
    uzletiEgyseg: d.uzletiEgyseg,
    sorok,
    osszegek: osszegAdat(calc),
    utankovetes: iso(d.utankovetes),
    utankovetesMegjegyzes: d.utankovetesMegjegyzes,
    kuldveAt: iso(d.kuldveAt),
    elvesztesOka: d.elvesztesOka,
    elvesztesMegjegyzes: d.elvesztesMegjegyzes,
    kovetkezoLepes: d.kovetkezoLepes,
    kovetkezoLepesIdopont: iso(d.kovetkezoLepesIdopont),
    archivalt: Boolean(d.archivalt),
    archivalasOka: d.archivalasOka,
    elozmenyek: elozmenyek<AjanlatAllapot>(d.statusHistory),
    ...(lathatjaKoltseg
      ? {
          fedezet: {
            koltseg: calc.osszesKoltseg,
            fedezet: calc.fedezet,
            fedezetSzazalek: calc.fedezetSzazalek,
          },
        }
      : {}),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

function toSablon(d: ISzerzodesSablon): SzerzodesSablonDto {
  return {
    id: String(d._id),
    nev: d.nev,
    kategoria: d.kategoria,
    leiras: d.leiras,
    szoveg: d.szoveg,
    valtozok: d.valtozok,
    digitalisAlairasKell: d.digitalisAlairasKell,
    aktiv: d.aktiv,
  };
}

function toSzerzodesDetail(d: ISzerzodes): SzerzodesDetail {
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    nev: d.nev,
    kategoria: d.kategoria,
    partnerId: d.partnerId,
    partnerNev: d.partnerNev,
    tipus: d.tipus,
    allapot: d.status.key as SzerzodesAllapot,
    sablonId: d.sablonId,
    szoveg: d.szoveg,
    sablonSzoveg: d.sablonSzoveg,
    valtozok: (d.valtozok ?? {}) as Record<string, string>,
    fajlHivatkozas: d.fajlHivatkozas,
    fajlNev: d.fajlNev,
    alairasTipus: d.alairasTipus,
    ugyfelNev: d.ugyfelNev,
    alairasAdat: d.alairasAdat,
    alairtAt: iso(d.alairtAt),
    ervenyessegKezdete: iso(d.ervenyessegKezdete),
    ervenyessegVege: iso(d.ervenyessegVege),
    projektId: d.projektId,
    portalLathato: d.portalLathato,
    megjegyzes: d.megjegyzes,
    elozmenyek: elozmenyek<SzerzodesAllapot>(d.statusHistory),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

function toMegrendeloDetail(d: IMegrendelolap): MegrendeloDetail {
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    beszallitoId: d.beszallitoId,
    beszallitoNev: d.beszallitoNev,
    projektId: d.projektId,
    ajanlatId: d.ajanlatId,
    allapot: d.status.key as MegrendeloAllapot,
    penznem: d.penznem,
    varhatoSzallitas: iso(d.varhatoSzallitas),
    megjegyzes: d.megjegyzes,
    sorok: d.sorok.map((s) => ({
      arlistaTetelId: s.arlistaTetelId,
      leiras: s.leiras,
      mennyiseg: s.mennyiseg,
      egyseg: s.egyseg,
      nettoEgysegar: s.nettoEgysegar,
      afaKulcs: s.afaKulcs,
    })),
    nettoOsszeg: d.nettoOsszeg,
    afaOsszeg: d.afaOsszeg,
    bruttoOsszeg: d.bruttoOsszeg,
    bevetelezes: d.bevetelezes
      ? {
          ok: d.bevetelezes.ok,
          idopont: d.bevetelezes.idopont.toISOString(),
          uzenet: d.bevetelezes.uzenet,
        }
      : undefined,
    archivalt: Boolean(d.archivalt),
    archivalasOka: d.archivalasOka,
    elozmenyek: elozmenyek<MegrendeloAllapot>(d.statusHistory),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

const kezdoAllapot = (key: string, szereplo: Szereplo) => {
  const entry = { key, changedAt: new Date(), changedBy: oid(szereplo.id) };
  return { status: entry, statusHistory: [entry] };
};

async function lapozottLista<D, R>(
  find: (
    filter: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number,
  ) => Promise<D[]>,
  count: (filter: Record<string, unknown>) => Promise<number>,
  built: ReturnType<typeof buildDataTableMongoQuery>,
  opciok: ListaOpciok,
  map: (d: D) => R,
): Promise<{ data: R[]; total: number }> {
  const filter = archivSzuro(built.filter, opciok.archivaltakkal);
  const sort =
    Object.keys(built.sort).length > 0 ? built.sort : { createdAt: -1 as const };
  const [rows, total] = await Promise.all([
    find(filter, sort, built.skip, built.limit),
    count(filter),
  ]);
  return { data: rows.map(map), total };
}

// ── Facade ─────────────────────────────────────────────────────────────────────

export const ertekesitesApi = {
  // ── Ajánlat ──────────────────────────────────────────────────────────────────

  async listAjanlatok(
    query: DataTableQuery,
    opciok: ListaOpciok = {},
  ): Promise<{ data: AjanlatListItem[]; total: number }> {
    await connectDB();
    const built = buildDataTableMongoQuery(query, AJANLAT_LIST_COLUMNS);
    return lapozottLista(
      (f, s, sk, l) =>
        Ajanlat.find(f).sort(s).skip(sk).limit(l).lean<IAjanlat[]>().exec(),
      (f) => Ajanlat.countDocuments(f).exec(),
      built,
      opciok,
      (d): AjanlatListItem => ({
        _id: String(d._id),
        azonosito: d.azonosito,
        cim: d.cim,
        partnerNev: d.partnerNev,
        allapot: d.status?.key as AjanlatAllapot,
        bruttoOsszeg: d.osszegek?.bruttoOsszeg ?? 0,
        penznem: d.penznem,
        ervenyesseg: d.ervenyesseg,
        utankovetes: d.utankovetes,
        archivalt: Boolean(d.archivalt),
        createdAt: d.createdAt,
      }),
    );
  },

  async getAjanlat(viewer: ErtekesitesViewer, id: string): Promise<AjanlatDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await Ajanlat.findById(id).exec();
    return d ? toAjanlatDetail(d, viewer) : null;
  },

  /**
   * Creates a draft. `sorok[].arSnapshot` is supplied by the app (from `arlistaApi.priceSnapshot`)
   * and stored as-is; the facade never reads prices itself. Totals are always recalculated here.
   */
  async createAjanlat(
    input: AjanlatInput,
    partner: PartnerPillanatkep,
    szereplo: Szereplo,
  ): Promise<{ ok: true; id: string }> {
    await connectDB();
    const sorok = sorokNormalizalasa(input.sorok);
    const osszegek = osszegAdat(
      ajanlatOsszesites(sorok, input.globalisKedvezmenySzazalek),
    );
    const azonosito = `AJ-${await nextSequence("ertekesites:ajanlat", 6)}`;
    const doc = await Ajanlat.create({
      azonosito,
      cim: input.cim,
      partnerId: input.partnerId,
      ...partner,
      penznem: input.penznem,
      ervenyesseg: input.ervenyesseg,
      megjegyzes: input.megjegyzes,
      uzletiEgyseg: input.uzletiEgyseg,
      sorok,
      osszegek,
      assignee: {
        userId: oid(szereplo.id),
        assignedAt: new Date(),
        assignedBy: oid(szereplo.id),
      },
      ...kezdoAllapot(AJANLAT_KEZDO_ALLAPOT, szereplo),
    });
    return { ok: true, id: String(doc._id) };
  },

  /** Draft-only (`assertSzerkesztheto`); otherwise a typed `nem_szerkesztheto` failure. */
  async updateAjanlat(
    id: string,
    input: AjanlatInput,
    partner: PartnerPillanatkep,
  ): Promise<Eredmeny> {
    if (!validId(id)) return fail("Az ajánlat nem található");
    await connectDB();
    return szerkesztesVedett(async () => {
      const d = await Ajanlat.findById(id).exec();
      if (!d) return fail("Az ajánlat nem található");
      if (d.archivalt) return fail("Archivált ajánlat nem szerkeszthető");
      assertSzerkesztheto("ajanlat", d.status.key);
      const sorok = sorokNormalizalasa(input.sorok);
      d.set({
        cim: input.cim,
        partnerId: input.partnerId,
        ...partner,
        penznem: input.penznem,
        ervenyesseg: input.ervenyesseg,
        megjegyzes: input.megjegyzes,
        uzletiEgyseg: input.uzletiEgyseg,
        sorok,
        osszegek: osszegAdat(ajanlatOsszesites(sorok, input.globalisKedvezmenySzazalek)),
      });
      await d.save();
      return { ok: true };
    });
  },

  /** Guarded status transition (`AJANLAT_ATMENETEK`). The send permission is checked by the action. */
  async changeAjanlatAllapot(
    id: string,
    input: AjanlatAllapotInput,
    szereplo: Szereplo,
  ): Promise<Eredmeny> {
    if (!validId(id)) return fail("Az ajánlat nem található");
    if (!AJANLAT_ALLAPOTOK.includes(input.allapot)) return fail("Érvénytelen állapot");
    await connectDB();
    const d = await Ajanlat.findById(id).exec();
    if (!d) return fail("Az ajánlat nem található");
    if (d.archivalt) return fail("Archivált ajánlat állapota nem módosítható");
    const regi = d.status.key as AjanlatAllapot;
    if (!AJANLAT_ATMENETEK[regi].includes(input.allapot))
      return fail(
        `Az ajánlat „${AJANLAT_ALLAPOT_LABELS[regi]}” állapotból nem állítható „${AJANLAT_ALLAPOT_LABELS[input.allapot]}” állapotba`,
        "ervenytelen_atmenet",
      );
    if (
      (input.allapot === "kesz" || input.allapot === "elkuldve") &&
      d.sorok.length === 0
    )
      return fail("Üres ajánlat nem jelölhető késznek vagy küldhető el");
    if (input.allapot === "elutasitva" && !input.elvesztesOka)
      return fail("Elutasításnál az okot meg kell adni");

    appendStatusChange(d, input.allapot, oid(szereplo.id), input.megjegyzes);
    if (input.allapot === "elkuldve") {
      d.kuldveAt = new Date();
      if (!d.utankovetes)
        d.utankovetes = munkanapHozzaad(new Date(), UTANKOVETES_MUNKANAP);
    }
    if (input.allapot === "elutasitva") {
      d.elvesztesOka = input.elvesztesOka;
      d.elvesztesMegjegyzes = input.elvesztesMegjegyzes;
    }
    await d.save();

    if (input.allapot === "elfogadva") {
      // Best-effort side effect: a failing listener never undoes the status change.
      try {
        await emitDomainEvent("ajanlat.elfogadva", {
          ajanlatId: String(d._id),
          azonosito: d.azonosito,
          partnerId: d.partnerId,
          partnerNev: d.partnerNev,
          nettoOsszeg: d.osszegek.kedvezmenyesNetto,
          bruttoOsszeg: d.osszegek.bruttoOsszeg,
          penznem: d.penznem,
          elfogadtaUserId: szereplo.id,
        });
      } catch (e) {
        console.error("[ertekesites] ajanlat.elfogadva event failed", e);
      }
    }
    return { ok: true };
  },

  /** Follow-up and next-step notes — allowed in any state (not content). */
  async setUtankovetes(id: string, input: UtankovetesInput): Promise<Eredmeny> {
    if (!validId(id)) return fail("Az ajánlat nem található");
    await connectDB();
    const res = await Ajanlat.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      {
        $set: {
          utankovetes: input.utankovetes ?? null,
          utankovetesMegjegyzes: input.utankovetesMegjegyzes ?? null,
          kovetkezoLepes: input.kovetkezoLepes ?? null,
          kovetkezoLepesIdopont: input.kovetkezoLepesIdopont ?? null,
        },
      },
    ).exec();
    return res.matchedCount === 0
      ? fail("Az ajánlat nem található vagy archivált")
      : { ok: true };
  },

  async archivAjanlat(id: string, ok: string, szereplo: Szereplo): Promise<Eredmeny> {
    if (!validId(id)) return fail("Az ajánlat nem található");
    await connectDB();
    const res = await Ajanlat.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      {
        $set: {
          archivalt: true,
          archivalasOka: ok,
          archivalasIdopont: new Date(),
          archivaltaId: oid(szereplo.id),
        },
      },
    ).exec();
    return res.matchedCount === 0
      ? fail("Az ajánlat nem található vagy már archivált")
      : { ok: true };
  },

  async restoreAjanlat(id: string): Promise<Eredmeny> {
    if (!validId(id)) return fail("Az ajánlat nem található");
    await connectDB();
    const res = await Ajanlat.updateOne(
      { _id: oid(id), archivalt: true },
      {
        $set: { archivalt: false },
        $unset: { archivalasOka: 1, archivalasIdopont: 1, archivaltaId: 1 },
      },
    ).exec();
    return res.matchedCount === 0
      ? fail("Az ajánlat nem található vagy nem archivált")
      : { ok: true };
  },

  /** Open offers the user is responsible for (follow-up date as due date). */
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
    if (viewer.permissions.includes("ertekesites:ajanlat:read")) {
      const { data } = await ertekesitesApi.listAjanlatok(sq);
      for (const a of data)
        out.push({
          module: "ertekesites",
          entityLabel: "Ajánlat",
          entityId: a._id,
          title: `${a.azonosito} · ${a.cim}`,
          subtitle: a.partnerNev,
          url: `/ertekesites/ajanlatok/${a._id}`,
        });
    }
    if (viewer.permissions.includes("ertekesites:szerzodes:read")) {
      const { data } = await ertekesitesApi.listSzerzodesek(sq);
      for (const s of data)
        out.push({
          module: "ertekesites",
          entityLabel: "Szerződés",
          entityId: s._id,
          title: `${s.azonosito} · ${s.nev}`,
          url: `/ertekesites/szerzodesek/${s._id}`,
        });
    }
    if (viewer.permissions.includes("ertekesites:megrendelo:read")) {
      const { data } = await ertekesitesApi.listMegrendelok(sq);
      for (const m of data)
        out.push({
          module: "ertekesites",
          entityLabel: "Megrendelőlap",
          entityId: m._id,
          title: m.azonosito,
          subtitle: m.beszallitoNev,
          url: `/ertekesites/megrendelok/${m._id}`,
        });
    }
    return out;
  },

  /** Latest status changes (newest first) — feeds the dashboard's activity panel. */
  async getTevekenyseg(limit = 8): Promise<ActivityRef[]> {
    await connectDB();
    const rows = await Ajanlat.find({
      archivalt: { $ne: true },
      "status.changedAt": { $exists: true },
    })
      .sort({ "status.changedAt": -1 })
      .limit(limit)
      .lean()
      .exec();
    return rows.map((d) => ({
      module: "ertekesites",
      entityType: "ajanlat",
      entityId: String(d._id),
      title: `${d.azonosito} · ${d.cim}`,
      statusLabel:
        AJANLAT_ALLAPOT_LABELS[d.status.key as keyof typeof AJANLAT_ALLAPOT_LABELS] ??
        d.status.key,
      changedAt: d.status.changedAt.toISOString(),
      changedBy: String(d.status.changedBy),
      url: `/ertekesites/ajanlatok/${d._id}`,
    }));
  },

  async listMyAssignments(userId: string): Promise<TaskRef[]> {
    if (!validId(userId)) return [];
    await connectDB();
    const items = await Ajanlat.find({
      "assignee.userId": oid(userId),
      archivalt: { $ne: true },
      "status.key": { $in: ["piszkozat", "kesz", "elkuldve"] },
    })
      .select("azonosito cim partnerNev status utankovetes")
      .lean<IAjanlat[]>()
      .exec();
    return items.map((a) => ({
      module: "ertekesites",
      entityType: "ajanlat",
      entityId: String(a._id),
      title: `${a.azonosito} · ${a.cim}`,
      status: AJANLAT_ALLAPOT_LABELS[a.status.key as AjanlatAllapot] ?? a.status.key,
      url: `/ertekesites/ajanlatok/${a._id}`,
      dueDate: a.utankovetes?.toISOString(),
      contextLabel: a.partnerNev,
    }));
  },

  // ── Szerződés-sablon ─────────────────────────────────────────────────────────

  async listSablonok(
    opciok: { csakAktiv?: boolean } = {},
  ): Promise<SzerzodesSablonDto[]> {
    await connectDB();
    const rows = await SzerzodesSablon.find(opciok.csakAktiv ? { aktiv: true } : {})
      .sort({ kategoria: 1, nev: 1 })
      .lean<ISzerzodesSablon[]>()
      .exec();
    return rows.map((r) => toSablon(r as ISzerzodesSablon));
  },

  async getSablon(id: string): Promise<SzerzodesSablonDto | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await SzerzodesSablon.findById(id).exec();
    return d ? toSablon(d) : null;
  },

  async createSablon(input: SzerzodesSablonInput): Promise<{ ok: true; id: string }> {
    await connectDB();
    const d = await SzerzodesSablon.create({
      ...input,
      valtozok: kitoltendoValtozok(input.szoveg),
    });
    return { ok: true, id: String(d._id) };
  },

  /** Editing a template never changes contracts already created from it (they hold a snapshot). */
  async updateSablon(id: string, input: SzerzodesSablonInput): Promise<Eredmeny> {
    if (!validId(id)) return fail("A sablon nem található");
    await connectDB();
    const res = await SzerzodesSablon.updateOne(
      { _id: oid(id) },
      { $set: { ...input, valtozok: kitoltendoValtozok(input.szoveg) } },
    ).exec();
    return res.matchedCount === 0 ? fail("A sablon nem található") : { ok: true };
  },

  // ── Szerződés ────────────────────────────────────────────────────────────────

  async listSzerzodesek(
    query: DataTableQuery,
    opciok: { torolttel?: boolean } = {},
  ): Promise<{ data: SzerzodesListItem[]; total: number }> {
    await connectDB();
    const built = buildDataTableMongoQuery(query, SZERZODES_LIST_COLUMNS);
    const and = Array.isArray(built.filter.$and) ? (built.filter.$and as unknown[]) : [];
    const filter =
      opciok.torolttel || built.filter["status.key"] !== undefined
        ? built.filter
        : { ...built.filter, $and: [...and, { "status.key": { $ne: "torolt" } }] };
    const sort =
      Object.keys(built.sort).length > 0 ? built.sort : { createdAt: -1 as const };
    const [rows, total] = await Promise.all([
      Szerzodes.find(filter)
        .sort(sort)
        .skip(built.skip)
        .limit(built.limit)
        .lean<ISzerzodes[]>()
        .exec(),
      Szerzodes.countDocuments(filter).exec(),
    ]);
    return {
      data: rows.map((d): SzerzodesListItem => ({
        _id: String(d._id),
        azonosito: d.azonosito,
        nev: d.nev,
        kategoria: d.kategoria,
        partnerNev: d.partnerNev,
        tipus: d.tipus,
        allapot: d.status.key as SzerzodesAllapot,
        alairasTipus: d.alairasTipus,
        ervenyessegVege: d.ervenyessegVege,
        createdAt: d.createdAt,
      })),
      total,
    };
  },

  async getSzerzodes(id: string): Promise<SzerzodesDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await Szerzodes.findById(id).exec();
    return d ? toSzerzodesDetail(d) : null;
  },

  async createSzerzodes(
    input: SzerzodesInput,
    partner: Pick<PartnerPillanatkep, "partnerNev">,
    szereplo: Szereplo,
  ): Promise<Eredmeny> {
    await connectDB();
    let sablonSzoveg: string | undefined;
    let szoveg: string | undefined;
    if (input.tipus === "generalt") {
      if (!input.sablonId || !validId(input.sablonId))
        return fail("A sablon nem található");
      const sablon = await SzerzodesSablon.findById(input.sablonId).exec();
      if (!sablon) return fail("A sablon nem található");
      if (!sablon.aktiv) return fail("A sablon nem aktív");
      const hianyzo = kitoltendoValtozok(sablon.szoveg).filter(
        (v) => !input.valtozok[v]?.trim(),
      );
      if (hianyzo.length > 0) return fail(`Hiányzó változók: ${hianyzo.join(", ")}`);
      sablonSzoveg = sablon.szoveg;
      szoveg = szerzodesRender(sablonSzoveg, input.valtozok, {
        partner_nev: partner.partnerNev,
      });
    } else if (!input.fajlHivatkozas) {
      return fail("Feltöltött szerződéshez a fájl hivatkozása kötelező");
    }
    const azonosito = `SZ-${await nextSequence("ertekesites:szerzodes", 6)}`;
    const d = await Szerzodes.create({
      azonosito,
      nev: input.nev,
      kategoria: input.kategoria,
      partnerId: input.partnerId,
      partnerNev: partner.partnerNev,
      tipus: input.tipus,
      sablonId: input.sablonId,
      sablonSzoveg,
      szoveg,
      valtozok: input.valtozok,
      fajlHivatkozas: input.fajlHivatkozas,
      fajlNev: input.fajlNev,
      alairasTipus: input.alairasTipus,
      ervenyessegKezdete: input.ervenyessegKezdete,
      ervenyessegVege: input.ervenyessegVege,
      projektId: input.projektId,
      portalLathato: input.portalLathato,
      megjegyzes: input.megjegyzes,
      ...kezdoAllapot("piszkozat", szereplo),
    });
    return { ok: true, id: String(d._id) };
  },

  /** Draft-only. The text is re-rendered from the frozen template body on every edit. */
  async updateSzerzodes(
    id: string,
    input: SzerzodesInput,
    partner: Pick<PartnerPillanatkep, "partnerNev">,
  ): Promise<Eredmeny> {
    if (!validId(id)) return fail("A szerződés nem található");
    await connectDB();
    return szerkesztesVedett(async () => {
      const d = await Szerzodes.findById(id).exec();
      if (!d) return fail("A szerződés nem található");
      assertSzerkesztheto("szerzodes", d.status.key);
      if (input.tipus !== d.tipus) return fail("A szerződés típusa nem módosítható");
      if (d.tipus === "generalt") {
        const hianyzo = kitoltendoValtozok(d.sablonSzoveg ?? "").filter(
          (v) => !input.valtozok[v]?.trim(),
        );
        if (hianyzo.length > 0) return fail(`Hiányzó változók: ${hianyzo.join(", ")}`);
        d.szoveg = szerzodesRender(d.sablonSzoveg ?? "", input.valtozok, {
          partner_nev: partner.partnerNev,
        });
      } else {
        if (!input.fajlHivatkozas)
          return fail("Feltöltött szerződéshez a fájl hivatkozása kötelező");
        d.fajlHivatkozas = input.fajlHivatkozas;
        d.fajlNev = input.fajlNev;
      }
      d.set({
        nev: input.nev,
        kategoria: input.kategoria,
        partnerId: input.partnerId,
        partnerNev: partner.partnerNev,
        valtozok: input.valtozok,
        alairasTipus: input.alairasTipus,
        ervenyessegKezdete: input.ervenyessegKezdete,
        ervenyessegVege: input.ervenyessegVege,
        projektId: input.projektId,
        portalLathato: input.portalLathato,
        megjegyzes: input.megjegyzes,
      });
      await d.save();
      return { ok: true };
    });
  },

  async changeSzerzodesAllapot(
    id: string,
    input: SzerzodesAllapotInput,
    szereplo: Szereplo,
  ): Promise<Eredmeny> {
    if (!validId(id)) return fail("A szerződés nem található");
    await connectDB();
    const d = await Szerzodes.findById(id).exec();
    if (!d) return fail("A szerződés nem található");
    const regi = d.status.key as SzerzodesAllapot;
    if (!SZERZODES_ATMENETEK[regi].includes(input.allapot))
      return fail(
        `A szerződés „${SZERZODES_ALLAPOT_LABELS[regi]}” állapotból nem állítható „${SZERZODES_ALLAPOT_LABELS[input.allapot]}” állapotba`,
        "ervenytelen_atmenet",
      );
    if (input.allapot === "digitalisan_alairt") {
      if (d.alairasTipus !== "digitalis")
        return fail(
          "Digitális aláírás csak digitális aláírási típusú szerződésnél rögzíthető",
        );
      if (!input.ugyfelNev) return fail("Az aláíró nevét meg kell adni");
      d.ugyfelNev = input.ugyfelNev;
      d.alairasAdat = input.alairasAdat;
      d.alairtAt = new Date();
    }
    if (input.allapot === "papiron_alairt") {
      d.ugyfelNev = input.ugyfelNev ?? d.ugyfelNev;
      d.alairtAt = new Date();
    }
    appendStatusChange(d, input.allapot, oid(szereplo.id), input.megjegyzes);
    await d.save();
    return { ok: true };
  },

  /** Portal visibility and note are workflow data, editable in any state. */
  async setSzerzodesPortal(
    id: string,
    mezok: { portalLathato: boolean; megjegyzes?: string },
  ): Promise<Eredmeny> {
    if (!validId(id)) return fail("A szerződés nem található");
    await connectDB();
    const res = await Szerzodes.updateOne(
      { _id: oid(id) },
      { $set: { portalLathato: mezok.portalLathato, megjegyzes: mezok.megjegyzes } },
    ).exec();
    return res.matchedCount === 0 ? fail("A szerződés nem található") : { ok: true };
  },

  // ── Megrendelőlap ────────────────────────────────────────────────────────────

  async listMegrendelok(
    query: DataTableQuery,
    opciok: ListaOpciok = {},
  ): Promise<{ data: MegrendeloListItem[]; total: number }> {
    await connectDB();
    const built = buildDataTableMongoQuery(query, MEGRENDELO_LIST_COLUMNS);
    return lapozottLista(
      (f, s, sk, l) =>
        Megrendelolap.find(f).sort(s).skip(sk).limit(l).lean<IMegrendelolap[]>().exec(),
      (f) => Megrendelolap.countDocuments(f).exec(),
      built,
      opciok,
      (d): MegrendeloListItem => ({
        _id: String(d._id),
        azonosito: d.azonosito,
        beszallitoNev: d.beszallitoNev,
        allapot: d.status.key as MegrendeloAllapot,
        bruttoOsszeg: d.bruttoOsszeg,
        penznem: d.penznem,
        varhatoSzallitas: d.varhatoSzallitas,
        archivalt: Boolean(d.archivalt),
        createdAt: d.createdAt,
      }),
    );
  },

  async getMegrendelo(id: string): Promise<MegrendeloDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await Megrendelolap.findById(id).exec();
    return d ? toMegrendeloDetail(d) : null;
  },

  async createMegrendelo(
    input: MegrendeloInput,
    beszallito: { beszallitoNev: string },
    szereplo: Szereplo,
  ): Promise<{ ok: true; id: string }> {
    await connectDB();
    const azonosito = `MR-${await nextSequence("ertekesites:megrendelo", 6)}`;
    const d = await Megrendelolap.create({
      azonosito,
      beszallitoId: input.beszallitoId,
      beszallitoNev: beszallito.beszallitoNev,
      projektId: input.projektId,
      ajanlatId: input.ajanlatId,
      penznem: input.penznem,
      varhatoSzallitas: input.varhatoSzallitas,
      megjegyzes: input.megjegyzes,
      sorok: input.sorok,
      ...megrendeloOsszesites(input.sorok),
      ...kezdoAllapot("piszkozat", szereplo),
    });
    return { ok: true, id: String(d._id) };
  },

  /** Draft-only; totals recalculated server-side. */
  async updateMegrendelo(
    id: string,
    input: MegrendeloInput,
    beszallito: { beszallitoNev: string },
  ): Promise<Eredmeny> {
    if (!validId(id)) return fail("A megrendelőlap nem található");
    await connectDB();
    return szerkesztesVedett(async () => {
      const d = await Megrendelolap.findById(id).exec();
      if (!d) return fail("A megrendelőlap nem található");
      if (d.archivalt) return fail("Archivált megrendelőlap nem szerkeszthető");
      assertSzerkesztheto("megrendelo", d.status.key);
      d.set({
        beszallitoId: input.beszallitoId,
        beszallitoNev: beszallito.beszallitoNev,
        projektId: input.projektId,
        ajanlatId: input.ajanlatId,
        penznem: input.penznem,
        varhatoSzallitas: input.varhatoSzallitas,
        megjegyzes: input.megjegyzes,
        sorok: input.sorok,
        ...megrendeloOsszesites(input.sorok),
      });
      await d.save();
      return { ok: true };
    });
  },

  /** piszkozat / elkuldve / torolt. Fulfilment goes through `teljesitMegrendelo`. */
  async changeMegrendeloAllapot(
    id: string,
    allapot: "piszkozat" | "elkuldve" | "torolt",
    szereplo: Szereplo,
    megjegyzes?: string,
  ): Promise<Eredmeny> {
    if (!validId(id)) return fail("A megrendelőlap nem található");
    await connectDB();
    const d = await Megrendelolap.findById(id).exec();
    if (!d) return fail("A megrendelőlap nem található");
    const regi = d.status.key as MegrendeloAllapot;
    if (!MEGRENDELO_ATMENETEK[regi].includes(allapot))
      return fail(
        `A megrendelőlap „${MEGRENDELO_ALLAPOT_LABELS[regi]}” állapotból nem állítható „${MEGRENDELO_ALLAPOT_LABELS[allapot]}” állapotba`,
        "ervenytelen_atmenet",
      );
    if (allapot === "elkuldve" && d.sorok.length === 0)
      return fail("Üres megrendelőlap nem küldhető el");
    appendStatusChange(d, allapot, oid(szereplo.id), megjegyzes);
    await d.save();
    return { ok: true };
  },

  /**
   * Fulfils a sent order. The status flips with a conditional atomic update (so a double click
   * calls the port once), then `port.bevetelez` is called when supplied and its result recorded.
   * A failed receipt leaves the order fulfilled but flagged; `ujraBevetelezMegrendelo` retries.
   */
  async teljesitMegrendelo(
    id: string,
    szereplo: Szereplo,
    port?: KeszletBevetelPort,
  ): Promise<Eredmeny> {
    if (!validId(id)) return fail("A megrendelőlap nem található");
    await connectDB();
    const entry = {
      key: "teljesitve",
      changedAt: new Date(),
      changedBy: oid(szereplo.id),
    };
    const res = await Megrendelolap.updateOne(
      { _id: oid(id), "status.key": "elkuldve", archivalt: { $ne: true } },
      { $set: { status: entry }, $push: { statusHistory: entry } },
    ).exec();
    if (res.matchedCount === 0)
      return fail("Csak elküldött megrendelőlap teljesíthető", "ervenytelen_atmenet");
    if (port) return ertekesitesApi.ujraBevetelezMegrendelo(id, port);
    return { ok: true };
  },

  /** Calls the stock port for a fulfilled order whose receipt has not succeeded yet. */
  async ujraBevetelezMegrendelo(id: string, port: KeszletBevetelPort): Promise<Eredmeny> {
    if (!validId(id)) return fail("A megrendelőlap nem található");
    await connectDB();
    const d = await Megrendelolap.findById(id).exec();
    if (!d) return fail("A megrendelőlap nem található");
    if (d.status.key !== "teljesitve") return fail("A megrendelőlap nincs teljesítve");
    if (d.bevetelezes?.ok) return { ok: true };
    const sorok: MegrendeloSor[] = d.sorok.map((s) => ({
      arlistaTetelId: s.arlistaTetelId,
      leiras: s.leiras,
      mennyiseg: s.mennyiseg,
      egyseg: s.egyseg,
      nettoEgysegar: s.nettoEgysegar,
      afaKulcs: s.afaKulcs,
    }));
    let eredmeny: { ok: boolean; uzenet?: string };
    try {
      const r = await port.bevetelez(sorok, {
        tipus: "megrendelolap",
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
    await Megrendelolap.updateOne(
      { _id: d._id },
      { $set: { bevetelezes: { ...eredmeny, idopont: new Date() } } },
    ).exec();
    return eredmeny.ok
      ? { ok: true }
      : fail(
          `A teljesítés rögzítve, de a bevételezés sikertelen: ${eredmeny.uzenet ?? ""}`,
        );
  },

  async archivMegrendelo(id: string, ok: string, szereplo: Szereplo): Promise<Eredmeny> {
    if (!validId(id)) return fail("A megrendelőlap nem található");
    await connectDB();
    const res = await Megrendelolap.updateOne(
      { _id: oid(id), archivalt: { $ne: true } },
      {
        $set: {
          archivalt: true,
          archivalasOka: ok,
          archivalasIdopont: new Date(),
          archivaltaId: oid(szereplo.id),
        },
      },
    ).exec();
    return res.matchedCount === 0
      ? fail("A megrendelőlap nem található vagy már archivált")
      : { ok: true };
  },

  async restoreMegrendelo(id: string): Promise<Eredmeny> {
    if (!validId(id)) return fail("A megrendelőlap nem található");
    await connectDB();
    const res = await Megrendelolap.updateOne(
      { _id: oid(id), archivalt: true },
      {
        $set: { archivalt: false },
        $unset: { archivalasOka: 1, archivalasIdopont: 1, archivaltaId: 1 },
      },
    ).exec();
    return res.matchedCount === 0
      ? fail("A megrendelőlap nem található vagy nem archivált")
      : { ok: true };
  },
} as const;
