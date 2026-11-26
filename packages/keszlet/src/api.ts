/**
 * Készlet facade. Stock changes go exclusively through the batch methods (`bevetelez`, `kiad`,
 * `foglal`, `foglalFeloldas`, `leltarLezar`) which follow the check-all → mutate-all pattern of
 * `engine.ts` (conditional atomic updates, idempotent per (referenceType, referenceId, lineIndex),
 * compensation on failure). Purchase prices and values are cut here by the viewer's permissions.
 *
 * No permission checks (Server Actions do that); the actor is always a parameter.
 */
import { Types } from "mongoose";
import { connectDB, nextSequence, User } from "@erp/db-core";
import { buildDataTableMongoQuery } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import {
  SEARCH_PER_TYPE,
  emitDomainEvent,
  type Ertesites,
  type SearchHit,
  type SearchViewer,
  type TaskRef,
} from "@erp/core";
import { KeszletTetel, type IKeszletTetel } from "./models/KeszletTetel";
import { KeszletMozgas } from "./models/KeszletMozgas";
import { Raktarhely } from "./models/Raktarhely";
import { Leltar, type ILeltar } from "./models/Leltar";
import { RmaUgy, type IRmaUgy } from "./models/RmaUgy";
import {
  KESZLET_LIST_COLUMNS,
  LELTAR_LIST_COLUMNS,
  RMA_LIST_COLUMNS,
  type KeszletListItem,
  type LeltarListItem,
  type RmaListItem,
} from "./columns";
import {
  HOLT_KESZLET_NAPOK,
  NINCS_HELY,
  NINCS_HELY_LABEL,
  RMA_AKTIV_ALLAPOTOK,
  RMA_ALLAPOT_LABELS,
  RMA_ATMENETEK,
  canSeeErtek,
  szuloKod,
  type KeszletRef,
  type KeszletViewer,
  type LeltarAllapot,
  type MozgasTipus,
  type RaktarhelyTipus,
  type ReferenceTipus,
  type RmaAllapot,
} from "./constants";
import {
  bevetelMuvelet,
  ensureTetel,
  foglalFeloldasMuvelet,
  foglalMuvelet,
  kiadMuvelet,
  korrekcioMuvelet,
  preflightSorok,
  type BevetelSor,
  type FoglalSor,
  type KiadSor,
  type MuveletEredmeny,
  type MuveletOpciok,
  type PreflightSor,
  type TermekSnapshot,
} from "./engine";
import {
  raktarhelySchema,
  rmaSchema,
  type RaktarhelyInput,
  type RmaInput,
} from "./validation";

export type {
  BevetelSor,
  FoglalSor,
  KiadSor,
  PreflightSor,
  TermekSnapshot,
  MuveletOpciok,
};

export type KeszletResult =
  | { ok: true; id?: string; idempotens?: boolean; ertesitesek: Ertesites[] }
  | { ok: false; message: string };

export type RaktarhelyDto = {
  id: string;
  kod: string;
  nev: string;
  tipus: RaktarhelyTipus;
  leiras?: string;
  szuloKod?: string;
  /** Depth in the code tree (root = 0). */
  szint: number;
  tetelDb: number;
};

export type KeszletMozgasSor = {
  id: string;
  tipus: MozgasTipus;
  valtozas: number;
  foglaltValtozas: number;
  referenceType: ReferenceTipus;
  referenceId: string;
  beszerzesiAr?: number;
  jegyzet?: string;
  createdAt: string;
};

export type KeszletDetail = Omit<KeszletListItem, "ertek"> & {
  utolsoBeszerzesiAr?: number;
  ertek?: number;
  megjegyzes?: string;
  mozgasok: KeszletMozgasSor[];
};

export type KeszletDashboard = {
  /** Total stock value — null when the viewer lacks `keszlet:ertek:read`. */
  osszErtek: number | null;
  alacsonyDb: number;
  aktivRma: number;
  raktarhelyDb: number;
  eloszlas: Array<{ kod: string; nev: string; darab: number; ertek: number | null }>;
  kritikus: KeszletListItem[];
  elfekvo: KeszletListItem[];
  utolsoMozgasok: Array<
    KeszletMozgasSor & { nev: string; kod: string; raktarhelyKod: string }
  >;
};

export type LeltarDetail = {
  id: string;
  sorszam: string;
  raktarhelyKod: string;
  allapot: LeltarAllapot;
  sorok: Array<{
    lineIndex: number;
    arlistaTermekId: string;
    nev: string;
    kod: string;
    egyseg: string;
    elvart: number;
    tenyleges: number | null;
    kulonbseg: number | null;
    indoklas?: string;
  }>;
  createdAt: string;
  lezartAt?: string;
};

export type RmaDetail = RmaListItem & {
  partnerId: string;
  megjegyzes?: string;
  felelosId?: string;
  felelosNev?: string;
  lehetsegesAtmenetek: RmaAllapot[];
  elozmenyek: Array<{ allapot: RmaAllapot; at: string; jegyzet?: string }>;
};

const NEM_TALALHATO = "A keresett elem nem található.";
const ok = (id?: string, ertesitesek: Ertesites[] = []): KeszletResult => ({
  ok: true,
  id,
  ertesitesek,
});
const hiba = (message: string): KeszletResult => ({ ok: false, message });
const validId = (id: string) => Types.ObjectId.isValid(id);
const nev = (u: { name?: string | null; email?: string } | undefined) =>
  u?.name || u?.email || "Ismeretlen";

/**
 * After a real issue: every touched row at or below its minimum raises `keszlet.alacsony`.
 * Best-effort — a failing listener or query never fails the issue itself.
 */
async function alacsonyKeszletJelzes(termekIdk: string[]): Promise<void> {
  try {
    const sorok = await KeszletTetel.find({
      arlistaTermekId: { $in: [...new Set(termekIdk)] },
      minimum: { $ne: null },
    })
      .lean<IKeszletTetel[]>()
      .exec();
    for (const t of sorok) {
      if (t.minimum === null || t.minimum === undefined || t.keszlet > t.minimum)
        continue;
      await emitDomainEvent("keszlet.alacsony", {
        tetelId: String(t._id),
        arlistaTermekId: t.arlistaTermekId,
        nev: t.nev,
        kod: t.kod,
        raktarhelyKod: t.raktarhelyKod,
        keszlet: t.keszlet,
        minimum: t.minimum,
      });
    }
  } catch (e) {
    console.error("[keszlet] alacsony készlet jelzés", e);
  }
}

function muvelet(r: MuveletEredmeny): KeszletResult {
  return r.ok ? { ok: true, idempotens: r.idempotens, ertesitesek: [] } : hiba(r.message);
}

function toListItem(t: IKeszletTetel, viewer: KeszletViewer): KeszletListItem {
  return {
    _id: String(t._id),
    arlistaTermekId: t.arlistaTermekId,
    nev: t.nev,
    kod: t.kod,
    egyseg: t.egyseg,
    raktarhelyKod: t.raktarhelyKod,
    keszlet: t.keszlet,
    foglalt: t.foglalt,
    szabad: t.keszlet - t.foglalt,
    minimum: t.minimum ?? undefined,
    // Value / purchase price is cut here, not in the UI.
    ...(canSeeErtek(viewer) && t.utolsoBeszerzesiAr !== undefined
      ? { ertek: t.keszlet * t.utolsoBeszerzesiAr }
      : {}),
    utolsoMozgasAt: t.utolsoMozgasAt?.toISOString(),
  };
}

function toMozgas(
  m: {
    _id: unknown;
    tipus: MozgasTipus;
    valtozas: number;
    foglaltValtozas: number;
    referenceType: ReferenceTipus;
    referenceId: string;
    beszerzesiAr?: number;
    jegyzet?: string;
    createdAt: Date;
  },
  viewer: KeszletViewer,
): KeszletMozgasSor {
  return {
    id: String(m._id),
    tipus: m.tipus,
    valtozas: m.valtozas,
    foglaltValtozas: m.foglaltValtozas,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    ...(canSeeErtek(viewer) && m.beszerzesiAr !== undefined
      ? { beszerzesiAr: m.beszerzesiAr }
      : {}),
    jegyzet: m.jegyzet,
    createdAt: m.createdAt.toISOString(),
  };
}

function toRmaList(r: IRmaUgy): RmaListItem {
  return {
    _id: String(r._id),
    sorszam: r.sorszam,
    termekNev: r.termekNev,
    termekKod: r.termekKod,
    gyariSzam: r.gyariSzam,
    mennyiseg: r.mennyiseg,
    partnerNev: r.partnerNev,
    beszallitoNev: r.beszallitoNev,
    allapot: r.status.key,
    createdAt: r.createdAt.toISOString(),
  };
}

async function evSorszam(key: string, elotag: string): Promise<string> {
  const ev = new Date().getFullYear();
  return `${elotag}-${ev}-${await nextSequence(`keszlet:${key}:${ev}`, 6)}`;
}

export const keszletApi = {
  // ── Stock mutations (the invariant methods) ───────────────────────────────

  /** Availability per line without side effects — delivery notes / worklogs call this first. */
  async preflight(sorok: KiadSor[]) {
    return preflightSorok(sorok);
  },

  async bevetelez(
    sorok: BevetelSor[],
    ref: KeszletRef,
    actorId: string,
    opts?: MuveletOpciok,
  ): Promise<KeszletResult> {
    return muvelet(await bevetelMuvelet(sorok, ref, actorId, opts));
  },

  async kiad(
    sorok: KiadSor[],
    ref: KeszletRef,
    actorId: string,
    opts?: MuveletOpciok,
  ): Promise<KeszletResult> {
    const r = muvelet(await kiadMuvelet(sorok, ref, actorId, opts));
    if (r.ok && !r.idempotens)
      await alacsonyKeszletJelzes(sorok.map((x) => x.arlistaTermekId));
    return r;
  },

  async foglal(
    sorok: FoglalSor[],
    ref: KeszletRef,
    actorId: string,
    opts?: MuveletOpciok,
  ): Promise<KeszletResult> {
    return muvelet(await foglalMuvelet(sorok, ref, actorId, opts));
  },

  async foglalFeloldas(
    sorok: FoglalSor[],
    ref: KeszletRef,
    actorId: string,
    opts?: MuveletOpciok,
  ): Promise<KeszletResult> {
    return muvelet(await foglalFeloldasMuvelet(sorok, ref, actorId, opts));
  },

  /** Recomputes keszlet/foglalt of every row from the movement log; returns the mismatches. */
  async ellenorzes(): Promise<
    Array<{
      id: string;
      keszlet: number;
      szamolt: number;
      foglalt: number;
      foglaltSzamolt: number;
    }>
  > {
    await connectDB();
    const sums = await KeszletMozgas.aggregate<{
      _id: Types.ObjectId;
      v: number;
      f: number;
    }>([
      {
        $group: {
          _id: "$tetelId",
          v: { $sum: "$valtozas" },
          f: { $sum: "$foglaltValtozas" },
        },
      },
    ]).exec();
    const map = new Map(sums.map((s) => [String(s._id), s]));
    const rows = await KeszletTetel.find().lean<IKeszletTetel[]>().exec();
    const out = [];
    for (const r of rows) {
      const s = map.get(String(r._id));
      const szamolt = s?.v ?? 0;
      const foglaltSzamolt = s?.f ?? 0;
      if (szamolt !== r.keszlet || foglaltSzamolt !== r.foglalt)
        out.push({
          id: String(r._id),
          keszlet: r.keszlet,
          szamolt,
          foglalt: r.foglalt,
          foglaltSzamolt,
        });
    }
    return out;
  },

  // ── Reads ──────────────────────────────────────────────────────────────────

  async listKeszlet(
    viewer: KeszletViewer,
    query: DataTableQuery,
  ): Promise<{ data: KeszletListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      KESZLET_LIST_COLUMNS,
    );
    const [rows, total] = await Promise.all([
      KeszletTetel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean<IKeszletTetel[]>()
        .exec(),
      KeszletTetel.countDocuments(filter).exec(),
    ]);
    return { data: rows.map((r) => toListItem(r, viewer)), total };
  },

  async getKeszlet(viewer: KeszletViewer, id: string): Promise<KeszletDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const t = await KeszletTetel.findById(id).lean<IKeszletTetel>().exec();
    if (!t) return null;
    const mozgasok = await KeszletMozgas.find({ tetelId: id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
    const item = toListItem(t, viewer);
    return {
      ...item,
      utolsoBeszerzesiAr: canSeeErtek(viewer) ? t.utolsoBeszerzesiAr : undefined,
      megjegyzes: t.megjegyzes,
      mozgasok: mozgasok.map((m) => toMozgas(m, viewer)),
    };
  },

  /** Stock rows of one product (all locations) — used by other modules' product pages. */
  async getTermekKeszlet(
    viewer: KeszletViewer,
    arlistaTermekId: string,
  ): Promise<KeszletListItem[]> {
    await connectDB();
    const rows = await KeszletTetel.find({ arlistaTermekId })
      .lean<IKeszletTetel[]>()
      .exec();
    return rows.map((r) => toListItem(r, viewer));
  },

  async setMinimum(id: string, minimum: number | null): Promise<KeszletResult> {
    if (!validId(id)) return hiba(NEM_TALALHATO);
    await connectDB();
    const r = await KeszletTetel.updateOne({ _id: id }, { $set: { minimum } }).exec();
    return r.matchedCount ? ok(id) : hiba(NEM_TALALHATO);
  },

  async getDashboard(viewer: KeszletViewer): Promise<KeszletDashboard> {
    await connectDB();
    const ertek = canSeeErtek(viewer);
    const [tetelek, helyek, aktivRma, utolso] = await Promise.all([
      KeszletTetel.find().lean<IKeszletTetel[]>().exec(),
      Raktarhely.find().sort({ kod: 1 }).lean().exec(),
      RmaUgy.countDocuments({ "status.key": { $in: RMA_AKTIV_ALLAPOTOK } }).exec(),
      KeszletMozgas.find().sort({ createdAt: -1 }).limit(10).lean().exec(),
    ]);
    const val = (t: IKeszletTetel) => t.keszlet * (t.utolsoBeszerzesiAr ?? 0);
    const elo = new Map<
      string,
      { kod: string; nev: string; darab: number; ertek: number }
    >();
    for (const h of helyek)
      elo.set(h.kod, { kod: h.kod, nev: h.nev, darab: 0, ertek: 0 });
    for (const t of tetelek) {
      const e = elo.get(t.raktarhelyKod) ?? {
        kod: t.raktarhelyKod,
        nev: t.raktarhelyKod === NINCS_HELY ? NINCS_HELY_LABEL : t.raktarhelyKod,
        darab: 0,
        ertek: 0,
      };
      e.darab += t.keszlet;
      e.ertek += val(t);
      elo.set(t.raktarhelyKod, e);
    }
    const cutoff = new Date(Date.now() - HOLT_KESZLET_NAPOK * 86_400_000);
    const kritikus = tetelek.filter((t) => t.minimum !== null && t.keszlet <= t.minimum);
    const elfekvo = tetelek.filter(
      (t) => t.keszlet > 0 && (t.utolsoMozgasAt ?? t.createdAt) < cutoff,
    );
    return {
      osszErtek: ertek ? tetelek.reduce((s, t) => s + val(t), 0) : null,
      alacsonyDb: kritikus.length,
      aktivRma,
      raktarhelyDb: helyek.length,
      eloszlas: [...elo.values()]
        .filter((e) => e.kod !== NINCS_HELY || e.darab > 0)
        .map((e) => ({ ...e, ertek: ertek ? e.ertek : null })),
      kritikus: kritikus.slice(0, 10).map((t) => toListItem(t, viewer)),
      elfekvo: elfekvo.slice(0, 10).map((t) => toListItem(t, viewer)),
      utolsoMozgasok: utolso.map((m) => ({
        ...toMozgas(m, viewer),
        nev: m.nev,
        kod: m.kod,
        raktarhelyKod: m.raktarhelyKod,
      })),
    };
  },

  // ── Raktárhelyek ───────────────────────────────────────────────────────────

  async listRaktarhelyek(): Promise<RaktarhelyDto[]> {
    await connectDB();
    const [helyek, db] = await Promise.all([
      Raktarhely.find().sort({ kod: 1 }).lean().exec(),
      KeszletTetel.aggregate<{ _id: string; n: number }>([
        { $group: { _id: "$raktarhelyKod", n: { $sum: 1 } } },
      ]).exec(),
    ]);
    const n = new Map(db.map((d) => [d._id, d.n]));
    return helyek.map((h) => ({
      id: String(h._id),
      kod: h.kod,
      nev: h.nev,
      tipus: h.tipus,
      leiras: h.leiras,
      szuloKod: h.szuloKod,
      szint: h.kod.split("/").length - 1,
      tetelDb: n.get(h.kod) ?? 0,
    }));
  },

  async createRaktarhely(input: RaktarhelyInput): Promise<KeszletResult> {
    const p = raktarhelySchema.safeParse(input);
    if (!p.success) return hiba(p.error.issues[0]?.message ?? "Érvénytelen adatok.");
    await connectDB();
    const szulo = szuloKod(p.data.kod);
    if (szulo && !(await Raktarhely.exists({ kod: szulo }).exec()))
      return hiba(`A szülő raktárhely (${szulo}) nem létezik — előbb azt vedd fel.`);
    try {
      const d = await Raktarhely.create({ ...p.data, szuloKod: szulo });
      return ok(String(d._id));
    } catch (e) {
      if ((e as { code?: number }).code === 11000) return hiba("Ez a kód már foglalt.");
      throw e;
    }
  },

  /** The code is the identity (stock rows reference it) and cannot change. */
  async updateRaktarhely(
    id: string,
    input: Pick<RaktarhelyInput, "nev" | "tipus" | "leiras">,
  ): Promise<KeszletResult> {
    if (!validId(id)) return hiba(NEM_TALALHATO);
    const nevOk = input.nev?.trim();
    if (!nevOk) return hiba("A név kötelező.");
    await connectDB();
    const r = await Raktarhely.updateOne(
      { _id: id },
      { $set: { nev: nevOk, tipus: input.tipus, leiras: input.leiras || undefined } },
    ).exec();
    return r.matchedCount ? ok(id) : hiba(NEM_TALALHATO);
  },

  async deleteRaktarhely(id: string): Promise<KeszletResult> {
    if (!validId(id)) return hiba(NEM_TALALHATO);
    await connectDB();
    const h = await Raktarhely.findById(id).lean().exec();
    if (!h) return hiba(NEM_TALALHATO);
    if (await Raktarhely.exists({ szuloKod: h.kod }).exec())
      return hiba("Az alá tartozó raktárhelyeket előbb törölni kell.");
    if (await KeszletTetel.exists({ raktarhelyKod: h.kod }).exec())
      return hiba("A raktárhelyen készlettétel van — előbb mozgasd át vagy nullázd le.");
    await Raktarhely.deleteOne({ _id: id }).exec();
    return ok(id);
  },

  // ── Leltár ─────────────────────────────────────────────────────────────────

  async listLeltarak(
    query: DataTableQuery,
  ): Promise<{ data: LeltarListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      LELTAR_LIST_COLUMNS,
    );
    const [rows, total] = await Promise.all([
      Leltar.find(filter).sort(sort).skip(skip).limit(limit).lean<ILeltar[]>().exec(),
      Leltar.countDocuments(filter).exec(),
    ]);
    return {
      data: rows.map((l) => ({
        _id: String(l._id),
        sorszam: l.sorszam,
        raktarhelyKod: l.raktarhelyKod || NINCS_HELY_LABEL,
        allapot: l.allapot,
        sorokDb: l.sorok.length,
        eltero: l.sorok.filter((s) => s.tenyleges !== null && s.tenyleges !== s.elvart)
          .length,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
    };
  },

  async getLeltar(id: string): Promise<LeltarDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const l = await Leltar.findById(id).lean<ILeltar>().exec();
    if (!l) return null;
    return {
      id: String(l._id),
      sorszam: l.sorszam,
      raktarhelyKod: l.raktarhelyKod,
      allapot: l.allapot,
      sorok: l.sorok.map((s, i) => ({
        lineIndex: i,
        arlistaTermekId: s.arlistaTermekId,
        nev: s.nev,
        kod: s.kod,
        egyseg: s.egyseg,
        elvart: s.elvart,
        tenyleges: s.tenyleges,
        kulonbseg: s.tenyleges === null ? null : s.tenyleges - s.elvart,
        indoklas: s.indoklas,
      })),
      createdAt: l.createdAt.toISOString(),
      lezartAt: l.lezartAt?.toISOString(),
    };
  },

  /** Starts a count of one location: snapshots the expected quantity of every stocked row. */
  async leltarInditas(raktarhelyKod: string, actorId: string): Promise<KeszletResult> {
    await connectDB();
    if (
      raktarhelyKod !== NINCS_HELY &&
      !(await Raktarhely.exists({ kod: raktarhelyKod }).exec())
    )
      return hiba("Ismeretlen raktárhely.");
    if (await Leltar.exists({ raktarhelyKod, allapot: { $ne: "lezarva" } }).exec())
      return hiba("Ezen a raktárhelyen már van folyamatban lévő leltár.");
    const rows = await KeszletTetel.find({ raktarhelyKod, keszlet: { $gt: 0 } })
      .sort({ nev: 1 })
      .lean<IKeszletTetel[]>()
      .exec();
    if (rows.length === 0) return hiba("A raktárhelyen nincs leltározható készlet.");
    const d = await Leltar.create({
      sorszam: await evSorszam("leltar", "LT"),
      raktarhelyKod,
      sorok: rows.map((r) => ({
        arlistaTermekId: r.arlistaTermekId,
        nev: r.nev,
        kod: r.kod,
        egyseg: r.egyseg,
        elvart: r.keszlet,
        tenyleges: null,
      })),
      letrehozoId: actorId,
    });
    return ok(String(d._id));
  },

  async leltarSorMent(
    id: string,
    lineIndex: number,
    tenyleges: number,
    indoklas: string | undefined,
  ): Promise<KeszletResult> {
    if (!validId(id)) return hiba(NEM_TALALHATO);
    if (!(tenyleges >= 0)) return hiba("A számolt mennyiség nem lehet negatív.");
    await connectDB();
    const set: Record<string, unknown> = { [`sorok.${lineIndex}.tenyleges`]: tenyleges };
    const unset: Record<string, ""> = {};
    if (indoklas?.trim()) set[`sorok.${lineIndex}.indoklas`] = indoklas.trim();
    else unset[`sorok.${lineIndex}.indoklas`] = "";
    const r = await Leltar.updateOne(
      { _id: id, allapot: "tervezet", [`sorok.${lineIndex}`]: { $exists: true } },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    ).exec();
    return r.matchedCount
      ? ok(id)
      : hiba("A leltár nem szerkeszthető (már lezárt vagy nincs ilyen sor).");
  },

  /**
   * Closes the count: every differing line becomes a `korrekcio` movement (idempotent per
   * (leltar, id, line)). `lezaras` freezes the counts while the movements are applied, so a
   * retry after a crash converges to the same movements.
   */
  async leltarLezar(
    id: string,
    actorId: string,
    opts?: MuveletOpciok,
  ): Promise<KeszletResult> {
    if (!validId(id)) return hiba(NEM_TALALHATO);
    await connectDB();
    const l = await Leltar.findById(id).lean<ILeltar>().exec();
    if (!l) return hiba(NEM_TALALHATO);
    if (l.allapot === "lezarva") return hiba("A leltár már le van zárva.");
    for (const [i, s] of l.sorok.entries()) {
      if (s.tenyleges === null)
        return hiba(`${i + 1}. tétel (${s.nev}): még nincs megszámolva.`);
      if (s.tenyleges !== s.elvart && !s.indoklas?.trim())
        return hiba(`${i + 1}. tétel (${s.nev}): eltérésnél az indoklás kötelező.`);
    }
    const lock = await Leltar.updateOne(
      { _id: id, allapot: { $in: ["tervezet", "lezaras"] } },
      { $set: { allapot: "lezaras" } },
    ).exec();
    if (lock.matchedCount === 0) return hiba("A leltár állapota időközben megváltozott.");

    const korrekciok = [];
    for (const [index, s] of l.sorok.entries()) {
      const delta = (s.tenyleges ?? 0) - s.elvart;
      if (delta === 0) continue;
      const row =
        (await KeszletTetel.findOne({
          arlistaTermekId: s.arlistaTermekId,
          raktarhelyKod: l.raktarhelyKod,
        })
          .lean<IKeszletTetel>()
          .exec()) ??
        (await ensureTetel(s.arlistaTermekId, l.raktarhelyKod, {
          nev: s.nev,
          kod: s.kod,
          egyseg: s.egyseg,
        }));
      korrekciok.push({ index, row, delta, jegyzet: s.indoklas });
    }
    const ref: KeszletRef = { referenceType: "leltar", referenceId: id };
    const r = await korrekcioMuvelet(korrekciok, ref, actorId, opts);
    if (!r.ok) {
      await Leltar.updateOne(
        { _id: id, allapot: "lezaras" },
        { $set: { allapot: "tervezet" } },
      ).exec();
      return hiba(r.message);
    }
    await Leltar.updateOne(
      { _id: id, allapot: "lezaras" },
      { $set: { allapot: "lezarva", lezartAt: new Date(), lezarId: actorId } },
    ).exec();
    return { ok: true, id, idempotens: r.idempotens, ertesitesek: [] };
  },

  // ── RMA ────────────────────────────────────────────────────────────────────

  async listRma(query: DataTableQuery): Promise<{ data: RmaListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      RMA_LIST_COLUMNS,
    );
    const [rows, total] = await Promise.all([
      RmaUgy.find(filter).sort(sort).skip(skip).limit(limit).lean<IRmaUgy[]>().exec(),
      RmaUgy.countDocuments(filter).exec(),
    ]);
    return { data: rows.map(toRmaList), total };
  },

  async getRma(id: string): Promise<RmaDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const r = await RmaUgy.findById(id).lean<IRmaUgy>().exec();
    if (!r) return null;
    const felelosId = r.assignee?.userId ? String(r.assignee.userId) : undefined;
    const u = felelosId
      ? await User.findById(felelosId).select("name email").lean().exec()
      : null;
    const allapot = r.status.key as RmaAllapot;
    return {
      ...toRmaList(r),
      partnerId: r.partnerId,
      megjegyzes: r.megjegyzes,
      felelosId,
      felelosNev: u ? nev(u) : undefined,
      lehetsegesAtmenetek: [...(RMA_ATMENETEK[allapot] ?? [])],
      elozmenyek: [...r.statusHistory].reverse().map((h) => ({
        allapot: h.key as RmaAllapot,
        at: h.changedAt.toISOString(),
        jegyzet: h.note,
      })),
    };
  },

  async createRma(input: RmaInput, actorId: string): Promise<KeszletResult> {
    const p = rmaSchema.safeParse(input);
    if (!p.success) return hiba(p.error.issues[0]?.message ?? "Érvénytelen adatok.");
    await connectDB();
    const d = p.data;
    const entry = {
      key: "beerkezett",
      changedAt: new Date(),
      changedBy: new Types.ObjectId(actorId),
    };
    const doc = await RmaUgy.create({
      sorszam: await evSorszam("rma", "RMA"),
      arlistaTermekId: d.arlistaTermekId,
      termekNev: d.termek.nev,
      termekKod: d.termek.kod,
      gyariSzam: d.gyariSzam,
      mennyiseg: d.mennyiseg,
      partnerId: d.partnerId,
      partnerNev: d.partnerNev,
      beszallitoNev: d.beszallitoNev,
      megjegyzes: d.megjegyzes,
      status: entry,
      statusHistory: [entry],
      assignee: null,
      notes: [],
    });
    return ok(String(doc._id));
  },

  /** One conditional update: of two concurrent transitions exactly one wins. */
  async rmaAtmenet(
    id: string,
    cel: RmaAllapot,
    actorId: string,
    extra?: { jegyzet?: string; beszallitoNev?: string },
  ): Promise<KeszletResult> {
    if (!validId(id)) return hiba(NEM_TALALHATO);
    await connectDB();
    const doc = await RmaUgy.findById(id).select("status assignee sorszam").lean().exec();
    if (!doc) return hiba(NEM_TALALHATO);
    const jelenlegi = doc.status.key as RmaAllapot;
    if (!(RMA_ATMENETEK[jelenlegi] ?? []).includes(cel))
      return hiba(
        `„${RMA_ALLAPOT_LABELS[jelenlegi]}” állapotból nem lehet „${RMA_ALLAPOT_LABELS[cel]}” állapotba lépni.`,
      );
    const entry = {
      key: cel,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(actorId),
      ...(extra?.jegyzet ? { note: extra.jegyzet } : {}),
    };
    const res = await RmaUgy.updateOne(
      { _id: id, "status.key": jelenlegi },
      {
        $set: {
          status: entry,
          ...(extra?.beszallitoNev ? { beszallitoNev: extra.beszallitoNev } : {}),
        },
        $push: { statusHistory: entry },
      },
    ).exec();
    if (res.matchedCount === 0)
      return hiba("Az ügy állapota időközben megváltozott — frissítsd az oldalt.");
    const felelos = doc.assignee?.userId ? String(doc.assignee.userId) : undefined;
    return ok(
      id,
      felelos && felelos !== actorId
        ? [
            {
              userIds: [felelos],
              title: `${doc.sorszam}: ${RMA_ALLAPOT_LABELS[cel]}`,
              body: "Az RMA ügy állapota megváltozott.",
              url: `/keszlet/rma/${id}`,
              tag: `rma-${id}`,
            },
          ]
        : [],
    );
  },

  async rmaAtad(id: string, userId: string, actorId: string): Promise<KeszletResult> {
    if (!validId(id) || !validId(userId)) return hiba(NEM_TALALHATO);
    await connectDB();
    const u = await User.findById(userId).select("isActive").lean().exec();
    if (!u || u.isActive === false) return hiba("A felelős nem található vagy inaktív.");
    const r = await RmaUgy.findOneAndUpdate(
      { _id: id, "status.key": { $in: RMA_AKTIV_ALLAPOTOK } },
      {
        $set: {
          assignee: {
            userId: new Types.ObjectId(userId),
            assignedAt: new Date(),
            assignedBy: new Types.ObjectId(actorId),
          },
        },
      },
    ).exec();
    if (!r) return hiba("Csak aktív RMA ügynek jelölhető ki felelős.");
    return ok(
      id,
      userId === actorId
        ? []
        : [
            {
              userIds: [userId],
              title: "RMA ügyet kaptál",
              body: `${r.sorszam} — ${r.termekNev}`,
              url: `/keszlet/rma/${id}`,
              tag: `rma-${id}`,
            },
          ],
    );
  },

  /** Active RMA cases the user is responsible for — feeds Teendőim / Feladatok. */
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
    if (viewer.permissions.includes("keszlet:keszlet:read")) {
      const { data } = await keszletApi.listKeszlet(viewer, sq);
      for (const t of data)
        out.push({
          module: "keszlet",
          entityLabel: "Készlet",
          entityId: t._id,
          title: t.nev,
          subtitle: `${t.kod} · ${t.keszlet} ${t.egyseg ?? "db"}`,
          url: `/keszlet/lista/${t._id}`,
        });
    }
    return out;
  },

  async listMyAssignments(userId: string): Promise<TaskRef[]> {
    if (!validId(userId)) return [];
    await connectDB();
    const rows = await RmaUgy.find({
      "assignee.userId": userId,
      "status.key": { $in: RMA_AKTIV_ALLAPOTOK },
    })
      .select("sorszam termekNev partnerNev status")
      .lean<IRmaUgy[]>()
      .exec();
    return rows.map((r) => ({
      module: "keszlet",
      entityType: "rma",
      entityId: String(r._id),
      title: `${r.sorszam} — ${r.termekNev}`,
      status: RMA_ALLAPOT_LABELS[r.status.key as RmaAllapot] ?? r.status.key,
      url: `/keszlet/rma/${r._id}`,
      contextLabel: r.partnerNev,
    }));
  },

  async listFelhasznalok(): Promise<Array<{ id: string; name: string }>> {
    await connectDB();
    const users = await User.find({ isActive: true })
      .select("name email")
      .sort({ name: 1 })
      .lean()
      .exec();
    return users.map((u) => ({ id: String(u._id), name: nev(u) }));
  },
};
