/**
 * Projekt facade. Production Mongo is a standalone without transactions: every change is one
 * conditional atomic update on a single document (the expected state is part of the filter),
 * `matchedCount === 0` means someone else won the race or the row is archived.
 *
 * Reads take a `Nezo` (viewer). A portal viewer only ever gets the visible, non-archived
 * projects of its own partner, in a safe projection — see `nezo.ts`.
 */
import { Types } from "mongoose";
import { connectDB, nextSequence, User } from "@erp/db-core";
import { buildDataTableMongoQuery } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import type { TaskRef } from "@erp/core";
import { Projekt, type IProjekt } from "./models/Projekt";
import { ProjektKoltseg } from "./models/ProjektKoltseg";
import { Alaprajz } from "./models/Alaprajz";
import { ChecklistSablon } from "./models/ChecklistSablon";
import { PROJEKT_LIST_COLUMNS, type ProjektListItem } from "./columns";
import {
  PROJEKT_ALLAPOT_LABELS,
  type ChecklistKategoria,
  type FazisAllapot,
  type Nezo,
  type NezoPortal,
  type NezoStaff,
  type ProjektAllapot,
  type StagingJovahagyas,
} from "./constants";
import { isPortal, projektNezoSzuro } from "./nezo";
import {
  checklistKeszHiba,
  lezarasAkadalyok,
  normalizalFazis,
  projektAtmenetMegengedett,
} from "./szabalyok";
import {
  archivSzuro,
  archivalas,
  elsoHiba,
  hiba,
  iso,
  nap,
  napStr,
  ok,
  oid,
  userNev,
  validId,
  visszaallitas,
  type ListaOpciok,
  type ProjektResult,
  type Szereplo,
  type UpdateFn,
} from "./shared";
import {
  archivalasSchema,
  checklistTetelSchema,
  fazisSchema,
  projektSchema,
  stagingJovahagyasSchema,
  stagingLinkSchema,
  type ChecklistTetelInput,
  type FazisInput,
  type ProjektInput,
} from "./validation";

export type FazisSor = {
  id: string;
  nev: string;
  allapot: FazisAllapot;
  hatarido?: string;
  szazalek: number;
};
export type StagingSor = {
  id: string;
  cimke: string;
  url: string;
  jovahagyas: StagingJovahagyas;
  jovahagyoNev?: string;
  jovahagyasMegjegyzes?: string;
  hozzaadva: string;
};
export type ChecklistSor = {
  id: string;
  cimke: string;
  kategoria: ChecklistKategoria;
  kotelezo: boolean;
  mellekletKotelezo: boolean;
  kesz: boolean;
  keszIdopont?: string;
  mellekletMediaIds: string[];
};

export type ProjektDetail = {
  id: string;
  azonosito: string;
  partnerId?: string;
  partnerNev?: string;
  nev: string;
  leiras?: string;
  kategoria?: string;
  kezdet?: string;
  hatarido?: string;
  lezarasIdopont?: string;
  tervezettOrak?: number;
  allapot: ProjektAllapot;
  szazalek: number;
  portalLathato: boolean;
  felelosId?: string;
  felelosNev?: string;
  belsoJegyzet?: string;
  fazisok: FazisSor[];
  stagingLinkek: StagingSor[];
  checklist: ChecklistSor[];
  archivalt: boolean;
  archivalasOka?: string;
};

/** What a portal viewer may see — allow-listed, no internal notes / checklist / expenses. */
export type ProjektPortalNezet = {
  id: string;
  azonosito: string;
  nev: string;
  leiras?: string;
  allapot: ProjektAllapot;
  hatarido?: string;
  szazalek: number;
  fazisok: Array<Omit<FazisSor, "id">>;
  stagingLinkek: Array<Pick<StagingSor, "id" | "cimke" | "url" | "jovahagyas">>;
};

export type ProjektOsszegzes = {
  nyitott: number;
  felfuggesztett: number;
  lezart: number;
  keso: number;
};

const NEM_TALALHATO = "A projekt nem található";
const ELVEGZETT = "A projekt állapota időközben megváltozott — frissítsd az oldalt.";

const upd: UpdateFn = async (f, u) => (await Projekt.updateOne(f, u).exec()).matchedCount;

function toListItem(p: IProjekt | (Record<string, unknown> & { _id: unknown })) {
  const d = p as unknown as IProjekt;
  return {
    _id: String(d._id),
    azonosito: d.azonosito,
    nev: d.nev,
    partnerNev: d.partnerNev,
    felelosNev: d.felelosNev,
    allapot: d.status.key,
    hatarido: iso(d.hatarido),
    szazalek: d.szazalek ?? 0,
    portalLathato: d.portalLathato,
    archivalt: d.archivalt,
    createdAt: d.createdAt.toISOString(),
  } satisfies ProjektListItem;
}

function toFazis(f: IProjekt["fazisok"][number]): FazisSor {
  return {
    id: String(f._id),
    nev: f.nev,
    allapot: f.allapot,
    hatarido: napStr(f.hatarido),
    szazalek: f.szazalek,
  };
}

function toDetail(d: IProjekt): ProjektDetail {
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    partnerId: d.partnerId,
    partnerNev: d.partnerNev,
    nev: d.nev,
    leiras: d.leiras,
    kategoria: d.kategoria,
    kezdet: napStr(d.kezdet),
    hatarido: napStr(d.hatarido),
    lezarasIdopont: iso(d.lezarasIdopont),
    tervezettOrak: d.tervezettOrak,
    allapot: d.status.key as ProjektAllapot,
    szazalek: d.szazalek ?? 0,
    portalLathato: d.portalLathato,
    felelosId: d.assignee?.userId ? String(d.assignee.userId) : undefined,
    felelosNev: d.felelosNev,
    belsoJegyzet: d.belsoJegyzet,
    fazisok: d.fazisok.map(toFazis),
    stagingLinkek: d.stagingLinkek.map((s) => ({
      id: String(s._id),
      cimke: s.cimke,
      url: s.url,
      jovahagyas: s.jovahagyas,
      jovahagyoNev: s.jovahagyoNev,
      jovahagyasMegjegyzes: s.jovahagyasMegjegyzes,
      hozzaadva: s.hozzaadva.toISOString(),
    })),
    checklist: d.checklist.map((c) => ({
      id: String(c._id),
      cimke: c.cimke,
      kategoria: c.kategoria,
      kotelezo: c.kotelezo,
      mellekletKotelezo: c.mellekletKotelezo,
      kesz: c.kesz,
      keszIdopont: iso(c.keszIdopont),
      mellekletMediaIds: c.mellekletMediaIds,
    })),
    archivalt: d.archivalt,
    archivalasOka: d.archivalasOka,
  };
}

function toPortal(d: IProjekt): ProjektPortalNezet {
  return {
    id: String(d._id),
    azonosito: d.azonosito,
    nev: d.nev,
    leiras: d.leiras,
    allapot: d.status.key as ProjektAllapot,
    hatarido: napStr(d.hatarido),
    szazalek: d.szazalek ?? 0,
    fazisok: d.fazisok.map(({ nev, allapot, hatarido, szazalek }) => ({
      nev,
      allapot,
      hatarido: napStr(hatarido),
      szazalek,
    })),
    stagingLinkek: d.stagingLinkek.map((s) => ({
      id: String(s._id),
      cimke: s.cimke,
      url: s.url,
      jovahagyas: s.jovahagyas,
    })),
  };
}

/** Atomic recomputation of the denormalized progress (aggregation-pipeline update). */
async function szazalekFrissit(id: string) {
  await Projekt.updateOne(
    { _id: id },
    [
      {
        $set: {
          szazalek: { $round: [{ $ifNull: [{ $avg: "$fazisok.szazalek" }, 0] }, 0] },
        },
      },
    ],
    { updatePipeline: true },
  ).exec();
}

/** Single-document mutation on a non-archived project; explains a miss. */
async function mutal(
  id: string,
  update: Record<string, unknown>,
  extra: Record<string, unknown> = {},
  miss = ELVEGZETT,
): Promise<ProjektResult> {
  if (!validId(id)) return hiba(NEM_TALALHATO);
  await connectDB();
  const matched = await upd({ _id: oid(id), archivalt: { $ne: true }, ...extra }, update);
  if (matched === 0) {
    const doc = await Projekt.findById(id).select("archivalt").lean().exec();
    if (!doc) return hiba(NEM_TALALHATO);
    return hiba(doc.archivalt ? "Az archivált projekt nem módosítható." : miss);
  }
  return ok(id);
}

async function felelosAdatok(felelosId?: string) {
  if (!felelosId) return { assignee: null, felelosNev: undefined as string | undefined };
  if (!validId(felelosId)) return null;
  const u = await User.findById(felelosId).select("name email isActive").lean().exec();
  if (!u || u.isActive === false) return null;
  return { userId: felelosId, felelosNev: userNev(u) };
}

function alapMezok(d: ReturnType<typeof projektSchema.parse>) {
  const set: Record<string, unknown> = {
    nev: d.nev,
    portalLathato: d.portalLathato,
  };
  const unset: Record<string, ""> = {};
  const opc: Record<string, unknown> = {
    partnerId: d.partnerId,
    partnerNev: d.partnerId ? d.partnerNev : undefined,
    leiras: d.leiras,
    kategoria: d.kategoria,
    kezdet: nap(d.kezdet),
    hatarido: nap(d.hatarido),
    tervezettOrak: d.tervezettOrak,
    belsoJegyzet: d.belsoJegyzet,
  };
  for (const [k, v] of Object.entries(opc)) {
    if (v !== undefined) set[k] = v;
    else unset[k] = "";
  }
  return { set, unset };
}

function nezoFilter(nezo: Nezo) {
  return projektNezoSzuro(nezo);
}

export function getProjekt(id: string, nezo: NezoStaff): Promise<ProjektDetail | null>;
export function getProjekt(
  id: string,
  nezo: NezoPortal,
): Promise<ProjektPortalNezet | null>;
export function getProjekt(
  id: string,
  nezo: Nezo,
): Promise<ProjektDetail | ProjektPortalNezet | null>;
export async function getProjekt(
  id: string,
  nezo: Nezo,
): Promise<ProjektDetail | ProjektPortalNezet | null> {
  if (!validId(id)) return null;
  await connectDB();
  const doc = await Projekt.findOne({ _id: id, ...nezoFilter(nezo) }).exec();
  if (!doc) return null;
  return isPortal(nezo) ? toPortal(doc) : toDetail(doc);
}

export const projektFacade = {
  getProjekt,

  async listProjektek(
    query: DataTableQuery,
    nezo: Nezo,
    opciok: ListaOpciok = {},
  ): Promise<{ data: ProjektListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      PROJEKT_LIST_COLUMNS,
    );
    const teljes = archivSzuro(
      { $and: [filter, nezoFilter(nezo)] },
      !isPortal(nezo) && opciok.archivaltakkal,
    );
    const [rows, total] = await Promise.all([
      Projekt.find(teljes).sort(sort).skip(skip).limit(limit).lean().exec(),
      Projekt.countDocuments(teljes).exec(),
    ]);
    const data = rows.map((r) => {
      const item = toListItem(r as unknown as IProjekt);
      // Staff identities and the visibility flag are internal.
      return isPortal(nezo) ? { ...item, felelosNev: undefined } : item;
    });
    return { data, total };
  },

  async getOsszegzes(): Promise<ProjektOsszegzes> {
    await connectDB();
    const rows = await Projekt.aggregate<{ _id: string; n: number }>([
      { $match: { archivalt: { $ne: true } } },
      { $group: { _id: "$status.key", n: { $sum: 1 } } },
    ]).exec();
    const n = (k: ProjektAllapot) => rows.find((r) => r._id === k)?.n ?? 0;
    const keso = await Projekt.countDocuments({
      archivalt: { $ne: true },
      "status.key": "nyitott",
      hatarido: { $lt: new Date() },
    }).exec();
    return {
      nyitott: n("nyitott"),
      felfuggesztett: n("felfuggesztett"),
      lezart: n("lezart"),
      keso,
    };
  },

  /** Active projects for dropdowns (expense form, weekly-plan links). */
  async listProjektOpciok(): Promise<
    Array<{ id: string; azonosito: string; nev: string }>
  > {
    await connectDB();
    const rows = await Projekt.find({ archivalt: { $ne: true } })
      .select("azonosito nev")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
      .exec();
    return rows.map((r) => ({ id: String(r._id), azonosito: r.azonosito, nev: r.nev }));
  },

  async createProjekt(input: ProjektInput, szereplo: Szereplo): Promise<ProjektResult> {
    const parsed = projektSchema.safeParse(input);
    if (!parsed.success) return hiba(elsoHiba(parsed.error.issues));
    await connectDB();
    const felelos = await felelosAdatok(parsed.data.felelosId);
    if (!felelos) return hiba("A felelős nem található vagy inaktív.");
    const azonosito = `PRJ-${await nextSequence("projekt:projekt", 6)}`;
    const now = new Date();
    const entry = {
      key: "nyitott",
      changedAt: now,
      changedBy: new Types.ObjectId(szereplo.id),
    };
    const { set } = alapMezok(parsed.data);
    const doc = await Projekt.create({
      ...set,
      azonosito,
      status: entry,
      statusHistory: [entry],
      assignee:
        "userId" in felelos
          ? {
              userId: new Types.ObjectId(felelos.userId),
              assignedAt: now,
              assignedBy: new Types.ObjectId(szereplo.id),
            }
          : null,
      felelosNev: felelos.felelosNev,
      notes: [],
    });
    return ok(String(doc._id));
  },

  /** Master data only — the state changes through `setAllapot`. */
  async updateProjekt(
    id: string,
    input: ProjektInput,
    szereplo: Szereplo,
  ): Promise<ProjektResult> {
    const parsed = projektSchema.safeParse(input);
    if (!parsed.success) return hiba(elsoHiba(parsed.error.issues));
    const felelos = await felelosAdatok(parsed.data.felelosId);
    if (!felelos) return hiba("A felelős nem található vagy inaktív.");
    const { set, unset } = alapMezok(parsed.data);
    if ("userId" in felelos) {
      set.assignee = {
        userId: new Types.ObjectId(felelos.userId),
        assignedAt: new Date(),
        assignedBy: new Types.ObjectId(szereplo.id),
      };
      set.felelosNev = felelos.felelosNev;
    } else {
      set.assignee = null;
      unset.felelosNev = "";
    }
    return mutal(id, { $set: set, $unset: unset });
  },

  /** The portal-visibility switch. */
  async setPortalLathato(id: string, lathato: boolean): Promise<ProjektResult> {
    return mutal(id, { $set: { portalLathato: lathato } });
  },

  /** nyitott / felfüggesztett / lezárt — lezárás needs every required checklist item done. */
  async setAllapot(
    id: string,
    to: ProjektAllapot,
    note: string | undefined,
    szereplo: Szereplo,
  ): Promise<ProjektResult> {
    if (!validId(id)) return hiba(NEM_TALALHATO);
    await connectDB();
    const doc = await Projekt.findById(id)
      .select("status checklist archivalt")
      .lean()
      .exec();
    if (!doc) return hiba(NEM_TALALHATO);
    if (doc.archivalt) return hiba("Az archivált projekt nem módosítható.");
    const from = doc.status.key as ProjektAllapot;
    if (!projektAtmenetMegengedett(from, to)) {
      return hiba(
        `„${PROJEKT_ALLAPOT_LABELS[from]}” projekt nem állítható „${PROJEKT_ALLAPOT_LABELS[to]}” állapotra.`,
      );
    }
    const extra: Record<string, unknown> = { "status.key": from };
    if (to === "lezart") {
      const akadaly = lezarasAkadalyok(doc.checklist);
      if (akadaly.length > 0) {
        return hiba(
          `Lezárás előtt teljesíteni kell a kötelező tételeket: ${akadaly.join(", ")}.`,
        );
      }
      // Re-checked atomically: a required item reopened meanwhile blocks the close.
      extra.checklist = { $not: { $elemMatch: { kotelezo: true, kesz: false } } };
    }
    const entry = {
      key: to,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(szereplo.id),
      ...(note?.trim() ? { note: note.trim() } : {}),
    };
    return mutal(
      id,
      {
        $set: {
          status: entry,
          ...(to === "lezart" ? { lezarasIdopont: entry.changedAt } : {}),
        },
        $push: { statusHistory: entry },
        ...(to !== "lezart" ? { $unset: { lezarasIdopont: "" } } : {}),
      },
      extra,
    );
  },

  /** Only a project without expenses can be deleted — otherwise it must be archived. */
  async deleteProjekt(id: string): Promise<ProjektResult> {
    if (!validId(id)) return hiba(NEM_TALALHATO);
    await connectDB();
    if ((await ProjektKoltseg.exists({ projektId: id }).exec()) !== null) {
      return hiba("A projekthez költség tartozik, ezért nem törölhető — archiváld.");
    }
    const res = await Projekt.deleteOne({ _id: id }).exec();
    if (!res.deletedCount) return hiba(NEM_TALALHATO);
    await Alaprajz.deleteMany({ projektId: id }).exec();
    return ok(id);
  },

  async archiveProjekt(id: string, okText: string, szereplo: Szereplo) {
    const p = archivalasSchema.safeParse({ ok: okText });
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    return archivalas(id, p.data.ok, szereplo, upd, NEM_TALALHATO);
  },

  async restoreProjekt(id: string) {
    await connectDB();
    return visszaallitas(id, upd, NEM_TALALHATO);
  },

  // ── Phases ────────────────────────────────────────────────────────────────────────────────
  async addFazis(id: string, input: FazisInput): Promise<ProjektResult> {
    const p = fazisSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    const n = normalizalFazis(p.data.allapot, p.data.szazalek);
    const r = await mutal(id, {
      $push: {
        fazisok: {
          nev: p.data.nev,
          ...n,
          hatarido: nap(p.data.hatarido),
          ...(n.allapot === "kesz" ? { befejezve: new Date() } : {}),
        },
      },
    });
    if (r.ok) await szazalekFrissit(id);
    return r;
  },

  async updateFazis(
    id: string,
    fazisId: string,
    input: FazisInput,
  ): Promise<ProjektResult> {
    const p = fazisSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    if (!validId(fazisId)) return hiba("A fázis nem található.");
    const n = normalizalFazis(p.data.allapot, p.data.szazalek);
    const r = await mutal(
      id,
      {
        $set: {
          "fazisok.$.nev": p.data.nev,
          "fazisok.$.allapot": n.allapot,
          "fazisok.$.szazalek": n.szazalek,
          ...(p.data.hatarido ? { "fazisok.$.hatarido": nap(p.data.hatarido) } : {}),
          ...(n.allapot === "kesz" ? { "fazisok.$.befejezve": new Date() } : {}),
        },
        $unset: {
          ...(p.data.hatarido ? {} : { "fazisok.$.hatarido": "" }),
          ...(n.allapot !== "kesz" ? { "fazisok.$.befejezve": "" } : {}),
        },
      },
      { "fazisok._id": oid(fazisId) },
      "A fázis nem található.",
    );
    if (r.ok) await szazalekFrissit(id);
    return r;
  },

  async removeFazis(id: string, fazisId: string): Promise<ProjektResult> {
    if (!validId(fazisId)) return hiba("A fázis nem található.");
    const r = await mutal(id, { $pull: { fazisok: { _id: oid(fazisId) } } });
    if (r.ok) await szazalekFrissit(id);
    return r;
  },

  // ── Staging links ─────────────────────────────────────────────────────────────────────────
  async addStagingLink(
    id: string,
    input: { cimke: string; url: string },
    szereplo: Szereplo,
  ): Promise<ProjektResult> {
    const p = stagingLinkSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    return mutal(id, {
      $push: {
        stagingLinkek: {
          ...p.data,
          hozzaadtaId: szereplo.id,
          hozzaadva: new Date(),
          jovahagyas: "fuggoben",
        },
      },
    });
  },

  async setStagingJovahagyas(
    id: string,
    linkId: string,
    input: { jovahagyas: StagingJovahagyas; megjegyzes?: string },
    szereplo: Szereplo,
  ): Promise<ProjektResult> {
    const p = stagingJovahagyasSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    if (!validId(linkId)) return hiba("A link nem található.");
    return mutal(
      id,
      {
        $set: {
          "stagingLinkek.$.jovahagyas": p.data.jovahagyas,
          "stagingLinkek.$.jovahagyoNev": szereplo.nev,
          "stagingLinkek.$.jovahagyasIdopont": new Date(),
          ...(p.data.megjegyzes
            ? { "stagingLinkek.$.jovahagyasMegjegyzes": p.data.megjegyzes }
            : {}),
        },
      },
      { "stagingLinkek._id": oid(linkId) },
      "A link nem található.",
    );
  },

  async removeStagingLink(id: string, linkId: string): Promise<ProjektResult> {
    if (!validId(linkId)) return hiba("A link nem található.");
    return mutal(id, { $pull: { stagingLinkek: { _id: oid(linkId) } } });
  },

  // ── Checklist ─────────────────────────────────────────────────────────────────────────────
  async addChecklistTetel(
    id: string,
    input: ChecklistTetelInput,
  ): Promise<ProjektResult> {
    const p = checklistTetelSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    return mutal(id, {
      $push: { checklist: { ...p.data, kesz: false, mellekletMediaIds: [] } },
    });
  },

  async removeChecklistTetel(id: string, tetelId: string): Promise<ProjektResult> {
    if (!validId(tetelId)) return hiba("A tétel nem található.");
    return mutal(id, { $pull: { checklist: { _id: oid(tetelId) } } });
  },

  /**
   * Ticks / unticks an item. An item with a required attachment can only be ticked when one is
   * present — enforced in the update filter itself, so a concurrent attachment removal cannot
   * slip through. `mediaIds` (uploaded by the app) are attached first.
   */
  async setChecklistKesz(
    id: string,
    tetelId: string,
    kesz: boolean,
    mediaIds: string[] = [],
  ): Promise<ProjektResult> {
    if (!validId(id)) return hiba(NEM_TALALHATO);
    if (!validId(tetelId)) return hiba("A tétel nem található.");
    await connectDB();
    const doc = await Projekt.findOne({ _id: id, "checklist._id": tetelId })
      .select("checklist archivalt")
      .lean()
      .exec();
    if (!doc) return hiba("A tétel nem található.");
    if (doc.archivalt) return hiba("Az archivált projekt nem módosítható.");
    const tetel = doc.checklist.find((c) => String(c._id) === tetelId);
    if (!tetel) return hiba("A tétel nem található.");
    const tiszta = mediaIds.map((m) => m.trim()).filter(Boolean);

    if (!kesz) {
      return mutal(
        id,
        {
          $set: { "checklist.$.kesz": false },
          $unset: { "checklist.$.keszIdopont": "" },
        },
        { "checklist._id": oid(tetelId) },
      );
    }
    const osszes = new Set([...tetel.mellekletMediaIds, ...tiszta]);
    const h = checklistKeszHiba({
      mellekletKotelezo: tetel.mellekletKotelezo,
      mellekletMediaIds: [...osszes],
    });
    if (h) return hiba(h);
    if (tiszta.length > 0) {
      const r = await mutal(
        id,
        { $addToSet: { "checklist.$.mellekletMediaIds": { $each: tiszta } } },
        { "checklist._id": oid(tetelId) },
      );
      if (!r.ok) return r;
    }
    return mutal(
      id,
      { $set: { "checklist.$.kesz": true, "checklist.$.keszIdopont": new Date() } },
      {
        checklist: {
          $elemMatch: {
            _id: oid(tetelId),
            ...(tetel.mellekletKotelezo
              ? { "mellekletMediaIds.0": { $exists: true } }
              : {}),
          },
        },
      },
      "A tételhez csatolmány szükséges — időközben megváltozott, próbáld újra.",
    );
  },

  async addMelleklet(
    id: string,
    tetelId: string,
    mediaId: string,
  ): Promise<ProjektResult> {
    if (!validId(tetelId) || !mediaId.trim()) return hiba("Érvénytelen csatolmány.");
    return mutal(
      id,
      { $addToSet: { "checklist.$.mellekletMediaIds": mediaId.trim() } },
      { "checklist._id": oid(tetelId) },
      "A tétel nem található.",
    );
  },

  /** The last attachment of a ticked item that requires one cannot be removed. */
  async removeMelleklet(
    id: string,
    tetelId: string,
    mediaId: string,
  ): Promise<ProjektResult> {
    if (!validId(tetelId)) return hiba("A tétel nem található.");
    return mutal(
      id,
      { $pull: { "checklist.$.mellekletMediaIds": mediaId } },
      {
        checklist: {
          $elemMatch: {
            _id: oid(tetelId),
            $nor: [
              {
                kesz: true,
                mellekletKotelezo: true,
                mellekletMediaIds: { $size: 1, $all: [mediaId] },
              },
            ],
          },
        },
      },
      "A kész, csatolmányt igénylő tétel utolsó csatolmánya nem törölhető — előbb vedd vissza a pipát.",
    );
  },

  /** Appends a template's items to the project's checklist. */
  async sablonAlkalmaz(id: string, sablonId: string): Promise<ProjektResult> {
    if (!validId(sablonId)) return hiba("A sablon nem található.");
    await connectDB();
    const s = await ChecklistSablon.findOne({ _id: sablonId, archivalt: { $ne: true } })
      .lean()
      .exec();
    if (!s) return hiba("A sablon nem található vagy archivált.");
    const tetelek = [...s.tetelek]
      .sort((a, b) => a.sorrend - b.sorrend)
      .map((t) => ({
        cimke: t.szoveg,
        kategoria: "egyeb" as const,
        kotelezo: t.kotelezo,
        mellekletKotelezo: t.mellekletKotelezo,
        kesz: false,
        mellekletMediaIds: [],
      }));
    if (tetelek.length === 0) return hiba("A sablonnak nincs tétele.");
    return mutal(id, { $push: { checklist: { $each: tetelek } } });
  },

  /** Projects the user is responsible for — feeds Teendőim as assignments. */
  async listMyAssignments(userId: string): Promise<TaskRef[]> {
    if (!validId(userId)) return [];
    await connectDB();
    const rows = await Projekt.find({
      "assignee.userId": userId,
      "status.key": "nyitott",
      archivalt: { $ne: true },
    })
      .select("azonosito nev status hatarido")
      .lean()
      .exec();
    return rows.map((p) => ({
      module: "projekt",
      entityType: "projekt",
      entityId: String(p._id),
      title: `Projekt — ${p.azonosito} ${p.nev}`,
      status: PROJEKT_ALLAPOT_LABELS[p.status.key as ProjektAllapot] ?? p.status.key,
      url: `/projekt/${p._id}`,
      dueDate: napStr(p.hatarido),
      kind: "assignment" as const,
    }));
  },

  /** Active users for the responsible / weekly-plan assignee pickers. */
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
