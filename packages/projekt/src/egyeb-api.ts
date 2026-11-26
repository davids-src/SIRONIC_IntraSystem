/** Koltség (expenses), checklist templates and floorplans. Staff-only: no viewer ever sees them. */
import { connectDB } from "@erp/db-core";
import { buildDataTableMongoQuery } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import { Projekt } from "./models/Projekt";
import { ProjektKoltseg, type IProjektKoltseg } from "./models/ProjektKoltseg";
import { ChecklistSablon, type IChecklistSablon } from "./models/ChecklistSablon";
import { Alaprajz, type IAlaprajz } from "./models/Alaprajz";
import {
  KOLTSEG_LIST_COLUMNS,
  SABLON_LIST_COLUMNS,
  type KoltsegListItem,
  type SablonListItem,
} from "./columns";
import type { JeloloTipus, Nezo } from "./constants";
import { isPortal } from "./nezo";
import {
  archivSzuro,
  archivalas,
  elsoHiba,
  hiba,
  iso,
  nap,
  ok,
  oid,
  validId,
  visszaallitas,
  type ListaOpciok,
  type ProjektResult,
  type Szereplo,
  type UpdateFn,
} from "./shared";
import {
  alaprajzSchema,
  archivalasSchema,
  koltsegSchema,
  sablonSchema,
  type AlaprajzInput,
  type KoltsegInput,
  type SablonInput,
} from "./validation";

const updK: UpdateFn = async (f, u) =>
  (await ProjektKoltseg.updateOne(f, u).exec()).matchedCount;
const updS: UpdateFn = async (f, u) =>
  (await ChecklistSablon.updateOne(f, u).exec()).matchedCount;
const updA: UpdateFn = async (f, u) =>
  (await Alaprajz.updateOne(f, u).exec()).matchedCount;

const KOLTSEG_NINCS = "A költség nem található";
const SABLON_NINCS = "A sablon nem található";
const ALAPRAJZ_NINCS = "Az alaprajz nem található";

export type KoltsegOsszesito = { db: number; osszeg: number; penznem: string };

export type SablonDetail = {
  id: string;
  nev: string;
  leiras?: string;
  kategoria?: string;
  tetelek: Array<{ szoveg: string; kotelezo: boolean; mellekletKotelezo: boolean }>;
  archivalt: boolean;
  archivalasOka?: string;
};

export type AlaprajzSor = {
  id: string;
  nev: string;
  partnerId?: string;
  projektId?: string;
  fajlMediaId: string;
  jelolok: Array<{
    x: number;
    y: number;
    cimke?: string;
    tipus: JeloloTipus;
    leiras?: string;
    hibajegyId?: string;
    eszkozId?: string;
  }>;
  archivalt: boolean;
  archivalasOka?: string;
};

function toKoltseg(d: IProjektKoltseg, projektNev?: string): KoltsegListItem {
  return {
    _id: String(d._id),
    projektId: d.projektId,
    projektNev,
    tipus: d.tipus,
    leiras: d.leiras,
    osszeg: d.osszeg,
    penznem: d.penznem,
    datum: iso(d.datum) as string,
    rogzitoNev: d.rogzitoNev,
    bizonylatMediaId: d.bizonylatMediaId,
    archivalt: d.archivalt,
  };
}

function koltsegMezok(d: ReturnType<typeof koltsegSchema.parse>) {
  const set: Record<string, unknown> = {
    tipus: d.tipus,
    osszeg: d.osszeg,
    penznem: d.penznem,
    datum: nap(d.datum),
  };
  const unset: Record<string, ""> = {};
  for (const k of ["leiras", "bizonylatMediaId", "munkalapId"] as const) {
    if (d[k] !== undefined) set[k] = d[k];
    else unset[k] = "";
  }
  return { set, unset };
}

function toSablon(d: IChecklistSablon): SablonDetail {
  return {
    id: String(d._id),
    nev: d.nev,
    leiras: d.leiras,
    kategoria: d.kategoria,
    tetelek: [...d.tetelek]
      .sort((a, b) => a.sorrend - b.sorrend)
      .map((t) => ({
        szoveg: t.szoveg,
        kotelezo: t.kotelezo,
        mellekletKotelezo: t.mellekletKotelezo,
      })),
    archivalt: d.archivalt,
    archivalasOka: d.archivalasOka,
  };
}

function toAlaprajz(d: IAlaprajz): AlaprajzSor {
  return {
    id: String(d._id),
    nev: d.nev,
    partnerId: d.partnerId,
    projektId: d.projektId,
    fajlMediaId: d.fajlMediaId,
    jelolok: d.jelolok.map((j) => ({
      x: j.x,
      y: j.y,
      cimke: j.cimke,
      tipus: j.tipus,
      leiras: j.leiras,
      hibajegyId: j.hibajegyId,
      eszkozId: j.eszkozId,
    })),
    archivalt: d.archivalt,
    archivalasOka: d.archivalasOka,
  };
}

export const egyebFacade = {
  // ── Költség ───────────────────────────────────────────────────────────────────────────────
  /** Expenses are internal: a portal viewer always gets an empty list. */
  async listKoltsegek(
    query: DataTableQuery,
    nezo: Nezo,
    opciok: ListaOpciok & { projektId?: string } = {},
  ): Promise<{ data: KoltsegListItem[]; total: number }> {
    if (isPortal(nezo)) return { data: [], total: 0 };
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      KOLTSEG_LIST_COLUMNS,
    );
    const teljes = archivSzuro(
      opciok.projektId ? { $and: [filter, { projektId: opciok.projektId }] } : filter,
      opciok.archivaltakkal,
    );
    const [rows, total] = await Promise.all([
      ProjektKoltseg.find(teljes).sort(sort).skip(skip).limit(limit).exec(),
      ProjektKoltseg.countDocuments(teljes).exec(),
    ]);
    const projektek = await Projekt.find({
      _id: { $in: [...new Set(rows.map((r) => r.projektId))].filter(validId) },
    })
      .select("azonosito nev")
      .lean()
      .exec();
    const nevek = new Map(
      projektek.map((p) => [String(p._id), `${p.azonosito} ${p.nev}`]),
    );
    return { data: rows.map((r) => toKoltseg(r, nevek.get(r.projektId))), total };
  },

  /** Sum of the non-archived expenses of a project; `null` for a portal viewer. */
  async getKoltsegOsszesito(
    projektId: string,
    nezo: Nezo,
  ): Promise<KoltsegOsszesito | null> {
    if (isPortal(nezo)) return null;
    await connectDB();
    const rows = await ProjektKoltseg.aggregate<{
      _id: string;
      db: number;
      osszeg: number;
    }>([
      { $match: { projektId, archivalt: { $ne: true } } },
      { $group: { _id: "$penznem", db: { $sum: 1 }, osszeg: { $sum: "$osszeg" } } },
      { $sort: { osszeg: -1 } },
    ]).exec();
    const db = rows.reduce((s, r) => s + r.db, 0);
    return { db, osszeg: rows[0]?.osszeg ?? 0, penznem: rows[0]?._id ?? "HUF" };
  },

  async getKoltseg(id: string, nezo: Nezo): Promise<KoltsegListItem | null> {
    if (isPortal(nezo) || !validId(id)) return null;
    await connectDB();
    const d = await ProjektKoltseg.findById(id).exec();
    return d ? toKoltseg(d) : null;
  },

  async createKoltseg(input: KoltsegInput, szereplo: Szereplo): Promise<ProjektResult> {
    const p = koltsegSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    if (!validId(p.data.projektId)) return hiba("A projekt nem található.");
    await connectDB();
    const projekt = await Projekt.findById(p.data.projektId)
      .select("archivalt")
      .lean()
      .exec();
    if (!projekt) return hiba("A projekt nem található.");
    if (projekt.archivalt) return hiba("Archivált projekthez nem rögzíthető költség.");
    const { set } = koltsegMezok(p.data);
    const doc = await ProjektKoltseg.create({
      ...set,
      projektId: p.data.projektId,
      leiras: p.data.leiras,
      bizonylatMediaId: p.data.bizonylatMediaId,
      munkalapId: p.data.munkalapId,
      rogzitoId: szereplo.id,
      rogzitoNev: szereplo.nev,
    });
    return ok(String(doc._id));
  },

  async updateKoltseg(id: string, input: KoltsegInput): Promise<ProjektResult> {
    const p = koltsegSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    if (!validId(id)) return hiba(KOLTSEG_NINCS);
    await connectDB();
    const { set, unset } = koltsegMezok(p.data);
    const matched = await updK(
      { _id: oid(id), archivalt: { $ne: true } },
      { $set: set, $unset: unset },
    );
    return matched === 0 ? hiba(`${KOLTSEG_NINCS} vagy archivált.`) : ok(id);
  },

  async archiveKoltseg(id: string, okText: string, szereplo: Szereplo) {
    const p = archivalasSchema.safeParse({ ok: okText });
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    return archivalas(id, p.data.ok, szereplo, updK, KOLTSEG_NINCS);
  },

  async restoreKoltseg(id: string) {
    await connectDB();
    return visszaallitas(id, updK, KOLTSEG_NINCS);
  },

  async deleteKoltseg(id: string): Promise<ProjektResult> {
    if (!validId(id)) return hiba(KOLTSEG_NINCS);
    await connectDB();
    const r = await ProjektKoltseg.deleteOne({ _id: id }).exec();
    return r.deletedCount ? ok(id) : hiba(KOLTSEG_NINCS);
  },

  // ── Sablon ────────────────────────────────────────────────────────────────────────────────
  async listSablonok(
    query: DataTableQuery,
    opciok: ListaOpciok = {},
  ): Promise<{ data: SablonListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      SABLON_LIST_COLUMNS,
    );
    const teljes = archivSzuro(filter, opciok.archivaltakkal);
    const [rows, total] = await Promise.all([
      ChecklistSablon.find(teljes).sort(sort).skip(skip).limit(limit).lean().exec(),
      ChecklistSablon.countDocuments(teljes).exec(),
    ]);
    return {
      data: rows.map((r) => ({
        _id: String(r._id),
        nev: r.nev,
        kategoria: r.kategoria,
        tetelSzam: r.tetelek.length,
        archivalt: r.archivalt,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    };
  },

  /** Active templates for the "apply to project" picker. */
  async listAktivSablonok(): Promise<
    Array<{ id: string; nev: string; tetelSzam: number }>
  > {
    await connectDB();
    const rows = await ChecklistSablon.find({ archivalt: { $ne: true } })
      .sort({ nev: 1 })
      .lean()
      .exec();
    return rows.map((r) => ({
      id: String(r._id),
      nev: r.nev,
      tetelSzam: r.tetelek.length,
    }));
  },

  async getSablon(id: string): Promise<SablonDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await ChecklistSablon.findById(id).exec();
    return d ? toSablon(d) : null;
  },

  async createSablon(input: SablonInput, szereplo: Szereplo): Promise<ProjektResult> {
    const p = sablonSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    const doc = await ChecklistSablon.create({
      ...p.data,
      tetelek: p.data.tetelek.map((t, i) => ({ ...t, sorrend: i })),
      letrehozoId: szereplo.id,
    });
    return ok(String(doc._id));
  },

  async updateSablon(id: string, input: SablonInput): Promise<ProjektResult> {
    const p = sablonSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    if (!validId(id)) return hiba(SABLON_NINCS);
    await connectDB();
    const unset: Record<string, ""> = {};
    if (!p.data.leiras) unset.leiras = "";
    if (!p.data.kategoria) unset.kategoria = "";
    const matched = await updS(
      { _id: oid(id), archivalt: { $ne: true } },
      {
        $set: {
          nev: p.data.nev,
          ...(p.data.leiras ? { leiras: p.data.leiras } : {}),
          ...(p.data.kategoria ? { kategoria: p.data.kategoria } : {}),
          tetelek: p.data.tetelek.map((t, i) => ({ ...t, sorrend: i })),
        },
        $unset: unset,
      },
    );
    return matched === 0 ? hiba(`${SABLON_NINCS} vagy archivált.`) : ok(id);
  },

  async archiveSablon(id: string, okText: string, szereplo: Szereplo) {
    const p = archivalasSchema.safeParse({ ok: okText });
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    return archivalas(id, p.data.ok, szereplo, updS, SABLON_NINCS);
  },

  async restoreSablon(id: string) {
    await connectDB();
    return visszaallitas(id, updS, SABLON_NINCS);
  },

  async deleteSablon(id: string): Promise<ProjektResult> {
    if (!validId(id)) return hiba(SABLON_NINCS);
    await connectDB();
    const r = await ChecklistSablon.deleteOne({ _id: id }).exec();
    return r.deletedCount ? ok(id) : hiba(SABLON_NINCS);
  },

  // ── Alaprajz (file refs only) ─────────────────────────────────────────────────────────────
  async listAlaprajzok(
    szuro: { projektId?: string; partnerId?: string } & ListaOpciok,
  ): Promise<AlaprajzSor[]> {
    await connectDB();
    const filter: Record<string, unknown> = {};
    if (szuro.projektId) filter.projektId = szuro.projektId;
    if (szuro.partnerId) filter.partnerId = szuro.partnerId;
    const rows = await Alaprajz.find(archivSzuro(filter, szuro.archivaltakkal))
      .sort({ createdAt: -1 })
      .exec();
    return rows.map(toAlaprajz);
  },

  async createAlaprajz(input: AlaprajzInput, szereplo: Szereplo): Promise<ProjektResult> {
    const p = alaprajzSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    if (!p.data.projektId && !p.data.partnerId)
      return hiba("Add meg a projektet vagy a partnert.");
    await connectDB();
    const doc = await Alaprajz.create({ ...p.data, letrehozoId: szereplo.id });
    return ok(String(doc._id));
  },

  async archiveAlaprajz(id: string, okText: string, szereplo: Szereplo) {
    const p = archivalasSchema.safeParse({ ok: okText });
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    await connectDB();
    return archivalas(id, p.data.ok, szereplo, updA, ALAPRAJZ_NINCS);
  },

  async restoreAlaprajz(id: string) {
    await connectDB();
    return visszaallitas(id, updA, ALAPRAJZ_NINCS);
  },
};
