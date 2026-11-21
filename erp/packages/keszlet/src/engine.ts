/**
 * Stock mutation engine — the no-transaction invariant pattern (PROJECT_PLAN §5.1).
 *
 * Production Mongo is a standalone (no multi-document transactions), so every batch is
 * **check-all → mutate-all**:
 *  1. resolve each line to one stock row and check the whole batch against fresh rows
 *     (cumulatively — two lines on the same row see each other). Any shortfall aborts with
 *     nothing changed;
 *  2. apply line by line with a CONDITIONAL atomic update on the row
 *     (`updateOne({ _id, <resulting state valid>, mozgasKulcsok: { $ne: key } }, { $inc, $push key })`)
 *     and verify `matchedCount`. The idempotency key is written in the same update as the `$inc`,
 *     so a retry can tell "already applied" from "not yet" without ever double-applying;
 *  3. if a line fails (lost a race, or any error), the lines applied so far are compensated with
 *     the inverse conditional update, and the batch reports failure;
 *  4. only when every line is applied are the append-only movements inserted (unique `kulcs`, so a
 *     retry that finds them present, or a crash between 2 and 4, converges to the same state).
 *
 * Invariant kept by every conditional: 0 <= foglalt <= keszlet.
 */
import { Types } from "mongoose";
import { connectDB } from "@erp/db-core";
import { KeszletTetel, type IKeszletTetel } from "./models/KeszletTetel";
import { KeszletMozgas } from "./models/KeszletMozgas";
import { Raktarhely } from "./models/Raktarhely";
import { NINCS_HELY, type KeszletRef, type MozgasTipus } from "./constants";

export type TermekSnapshot = { nev: string; kod: string; egyseg: string };

type Alap = {
  arlistaTermekId: string;
  mennyiseg: number;
  raktarhelyKod?: string;
  jegyzet?: string;
};
export type BevetelSor = Alap & { termek: TermekSnapshot; beszerzesiAr?: number };
/** `foglalasbol`: the issue consumes the line's own reservation (foglalt and keszlet both drop). */
export type KiadSor = Alap & { foglalasbol?: boolean };
export type FoglalSor = Alap;

export type PreflightSor = {
  lineIndex: number;
  arlistaTermekId: string;
  nev?: string;
  raktarhelyKod?: string;
  kert: number;
  keszlet: number;
  foglalt: number;
  szabad: number;
  elegendo: boolean;
  uzenet?: string;
};

export type MuveletEredmeny =
  | { ok: true; idempotens: boolean }
  | { ok: false; message: string; kompenzalva?: number };

/** Test seam: awaited right before line `index` is applied (never set in production code). */
export type MuveletOpciok = { beforeLine?: (index: number) => Promise<void> | void };

type Row = Pick<
  IKeszletTetel,
  | "_id"
  | "keszlet"
  | "foglalt"
  | "nev"
  | "kod"
  | "egyseg"
  | "raktarhelyKod"
  | "arlistaTermekId"
> & { mozgasKulcsok?: string[] };

export type Terv = {
  index: number;
  kulcs: string;
  tipus: MozgasTipus;
  row: Row;
  dv: number;
  df: number;
  beszerzesiAr?: number;
  jegyzet?: string;
};

const SOR_HIBA = (i: number, msg: string) => `${i + 1}. tétel: ${msg}`;

export const kulcsOf = (tipus: MozgasTipus, ref: KeszletRef, lineIndex: number): string =>
  `${tipus}:${ref.referenceType}:${ref.referenceId}:${lineIndex}`;

/** The state after applying (dv, df) is valid: foglalt >= 0 and keszlet >= foglalt. */
export function ervenyes(
  keszlet: number,
  foglalt: number,
  dv: number,
  df: number,
): boolean {
  const k = keszlet + dv;
  const f = foglalt + df;
  return f >= 0 && k >= f;
}

function feltetelExpr(dv: number, df: number) {
  const k = { $add: ["$keszlet", dv] };
  const f = { $add: ["$foglalt", df] };
  return { $and: [{ $gte: [f, 0] }, { $gte: [k, f] }] };
}

const duplicateKey = (e: unknown) =>
  typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;

async function hellyelLetezik(kod: string): Promise<boolean> {
  if (kod === NINCS_HELY) return true;
  return (await Raktarhely.exists({ kod }).exec()) !== null;
}

/** Finds (or creates the empty) stock row for a product at a location. */
export async function ensureTetel(
  arlistaTermekId: string,
  raktarhelyKod: string,
  termek: TermekSnapshot,
): Promise<Row> {
  const filter = { arlistaTermekId, raktarhelyKod };
  try {
    await KeszletTetel.updateOne(
      filter,
      {
        $setOnInsert: {
          nev: termek.nev,
          kod: termek.kod,
          egyseg: termek.egyseg,
          keszlet: 0,
          foglalt: 0,
          minimum: null,
          mozgasKulcsok: [],
        },
      },
      { upsert: true },
    ).exec();
  } catch (e) {
    if (!duplicateKey(e)) throw e;
  }
  return (await KeszletTetel.findOne(filter).lean<Row>().exec())!;
}

type Virt = Map<string, { dv: number; df: number }>;

function virtOf(v: Virt, id: string) {
  return v.get(id) ?? { dv: 0, df: 0 };
}

/**
 * Picks the stock row of an issue/reserve line: the explicit location, else a row that already
 * carries this key (retry), else the row of the product with the most free stock.
 */
async function resolveRow(
  l: Alap,
  kulcs: string | undefined,
  virt: Virt,
  szuksegesSzabad: number,
): Promise<{ row: Row } | { hiba: string }> {
  if (kulcs) {
    const mar = await KeszletTetel.findOne({ mozgasKulcsok: kulcs }).lean<Row>().exec();
    if (mar) return { row: mar };
  }
  if (l.raktarhelyKod !== undefined) {
    const row = await KeszletTetel.findOne({
      arlistaTermekId: l.arlistaTermekId,
      raktarhelyKod: l.raktarhelyKod,
    })
      .lean<Row>()
      .exec();
    return row
      ? { row }
      : { hiba: "ezen a raktárhelyen nincs készlet ebből a termékből." };
  }
  const rows = await KeszletTetel.find({ arlistaTermekId: l.arlistaTermekId })
    .lean<Row[]>()
    .exec();
  if (rows.length === 0) return { hiba: "ebből a termékből nincs készlet." };
  const szabad = (r: Row) =>
    r.keszlet +
    virtOf(virt, String(r._id)).dv -
    (r.foglalt + virtOf(virt, String(r._id)).df);
  const sorted = [...rows].sort((a, b) => szabad(b) - szabad(a));
  const jo = sorted.find((r) => szabad(r) >= szuksegesSzabad) ?? sorted[0]!;
  return { row: jo };
}

type Kind = "kiadas" | "foglalas" | "feloldas";

/** Turns user lines into plans (resolving rows) and checks the whole batch against fresh rows. */
async function tervez(
  kind: Kind,
  sorok: Array<KiadSor | FoglalSor>,
  ref: KeszletRef | undefined,
): Promise<
  | { ok: true; tervek: Terv[]; sorok: PreflightSor[] }
  | { ok: false; message: string; sorok: PreflightSor[] }
> {
  const virt: Virt = new Map();
  const tervek: Terv[] = [];
  const out: PreflightSor[] = [];
  let hiba: string | undefined;
  for (let i = 0; i < sorok.length; i++) {
    const l = sorok[i]!;
    const foglalasbol = kind === "kiadas" && (l as KiadSor).foglalasbol === true;
    const tipus: MozgasTipus =
      kind === "kiadas"
        ? "kiadas"
        : kind === "foglalas"
          ? "foglalas"
          : "foglalas_feloldas";
    const kulcs = ref ? kulcsOf(tipus, ref, i) : undefined;
    const alap: PreflightSor = {
      lineIndex: i,
      arlistaTermekId: l.arlistaTermekId,
      kert: l.mennyiseg,
      keszlet: 0,
      foglalt: 0,
      szabad: 0,
      elegendo: false,
    };
    if (!(l.mennyiseg > 0)) {
      alap.uzenet = "a mennyiségnek nullánál nagyobbnak kell lennie.";
      out.push(alap);
      hiba ??= SOR_HIBA(i, alap.uzenet);
      continue;
    }
    const r = await resolveRow(l, kulcs, virt, foglalasbol ? 0 : l.mennyiseg);
    if ("hiba" in r) {
      alap.uzenet = r.hiba;
      out.push(alap);
      hiba ??= SOR_HIBA(i, r.hiba);
      continue;
    }
    const { row } = r;
    const v = virtOf(virt, String(row._id));
    const dv = kind === "kiadas" ? -l.mennyiseg : 0;
    const df =
      kind === "foglalas"
        ? l.mennyiseg
        : kind === "feloldas"
          ? -l.mennyiseg
          : foglalasbol
            ? -l.mennyiseg
            : 0;
    const keszlet = row.keszlet + v.dv;
    const foglalt = row.foglalt + v.df;
    const mar = kulcs ? (row.mozgasKulcsok ?? []).includes(kulcs) : false;
    // A line whose key is already on the row was applied by an earlier attempt: counts as ok.
    const elegendo = mar || ervenyes(keszlet, foglalt, dv, df);
    Object.assign(alap, {
      nev: row.nev,
      raktarhelyKod: row.raktarhelyKod,
      keszlet,
      foglalt,
      szabad: keszlet - foglalt,
      elegendo,
    });
    if (!elegendo) {
      alap.uzenet =
        kind === "feloldas"
          ? `csak ${foglalt} db foglalás van, ennyit nem lehet feloldani (${l.mennyiseg}).`
          : kind === "foglalas"
            ? `nincs elég szabad készlet a foglaláshoz (${row.nev}: kért ${l.mennyiseg}, szabad ${keszlet - foglalt}).`
            : foglalasbol
              ? `nincs elég foglalt készlet (${row.nev}: kért ${l.mennyiseg}, foglalt ${foglalt}).`
              : `nincs elég szabad készlet (${row.nev}: kért ${l.mennyiseg}, szabad ${keszlet - foglalt}).`;
      hiba ??= SOR_HIBA(i, alap.uzenet);
    }
    if (!mar) virt.set(String(row._id), { dv: v.dv + dv, df: v.df + df });
    out.push(alap);
    if (ref)
      tervek.push({ index: i, kulcs: kulcs!, tipus, row, dv, df, jegyzet: l.jegyzet });
  }
  return hiba
    ? { ok: false, message: hiba, sorok: out }
    : { ok: true, tervek, sorok: out };
}

/** Availability per line, no side effects (delivery notes / worklogs call this before issuing). */
export async function preflightSorok(
  sorok: KiadSor[],
): Promise<{ osszesElegendo: boolean; sorok: PreflightSor[] }> {
  await connectDB();
  const r = await tervez("kiadas", sorok, undefined);
  return { osszesElegendo: r.ok, sorok: r.sorok };
}

async function kompenzal(alkalmazott: Terv[]): Promise<number> {
  let hibas = 0;
  for (const t of [...alkalmazott].reverse()) {
    try {
      const res = await KeszletTetel.updateOne(
        { _id: t.row._id, mozgasKulcsok: t.kulcs, $expr: feltetelExpr(-t.dv, -t.df) },
        { $inc: { keszlet: -t.dv, foglalt: -t.df }, $pull: { mozgasKulcsok: t.kulcs } },
      ).exec();
      if (res.matchedCount === 0) hibas++;
    } catch {
      hibas++;
    }
  }
  return hibas;
}

async function naplozz(tervek: Terv[], ref: KeszletRef, actorId: string) {
  for (const t of tervek) {
    try {
      await KeszletMozgas.create({
        kulcs: t.kulcs,
        tipus: t.tipus,
        tetelId: t.row._id,
        arlistaTermekId: t.row.arlistaTermekId,
        raktarhelyKod: t.row.raktarhelyKod,
        nev: t.row.nev,
        kod: t.row.kod,
        valtozas: t.dv,
        foglaltValtozas: t.df,
        referenceType: ref.referenceType,
        referenceId: ref.referenceId,
        lineIndex: t.index,
        beszerzesiAr: t.beszerzesiAr,
        jegyzet: t.jegyzet,
        actorId: new Types.ObjectId(actorId),
      });
    } catch (e) {
      if (!duplicateKey(e)) throw e;
    }
  }
}

/** Mutate phase shared by every batch method (plans already checked). */
async function alkalmaz(
  tervek: Terv[],
  ref: KeszletRef,
  actorId: string,
  opts?: MuveletOpciok,
): Promise<MuveletEredmeny> {
  const kulcsok = tervek.map((t) => t.kulcs);
  const letezo = new Set(
    (
      await KeszletMozgas.find({ kulcs: { $in: kulcsok } })
        .select("kulcs")
        .lean()
        .exec()
    ).map((m) => m.kulcs),
  );
  const hatra = tervek.filter((t) => !letezo.has(t.kulcs));
  if (hatra.length === 0) return { ok: true, idempotens: true };

  const alkalmazott: Terv[] = [];
  const now = new Date();
  try {
    for (const t of hatra) {
      await opts?.beforeLine?.(t.index);
      const set: Record<string, unknown> = {};
      if (t.tipus !== "foglalas" && t.tipus !== "foglalas_feloldas")
        set.utolsoMozgasAt = now;
      if (t.beszerzesiAr !== undefined && t.dv > 0)
        set.utolsoBeszerzesiAr = t.beszerzesiAr;
      const res = await KeszletTetel.updateOne(
        {
          _id: t.row._id,
          mozgasKulcsok: { $ne: t.kulcs },
          ...(t.dv < 0 ? { keszlet: { $gte: -t.dv } } : {}),
          $expr: feltetelExpr(t.dv, t.df),
        },
        {
          $inc: { keszlet: t.dv, foglalt: t.df },
          $push: { mozgasKulcsok: { $each: [t.kulcs], $slice: -1000 } },
          ...(Object.keys(set).length ? { $set: set } : {}),
        },
      ).exec();
      if (res.matchedCount === 1) {
        alkalmazott.push(t);
        continue;
      }
      // No match: either an earlier attempt already applied this key (fine) or the condition failed.
      const mar = await KeszletTetel.exists({
        _id: t.row._id,
        mozgasKulcsok: t.kulcs,
      }).exec();
      if (mar) {
        alkalmazott.push(t);
        continue;
      }
      const kompenzalasHiba = await kompenzal(alkalmazott);
      return {
        ok: false,
        message: SOR_HIBA(
          t.index,
          "időközben megváltozott a készlet, a művelet nem hajtható végre. Semmi nem változott — próbáld újra.",
        ),
        kompenzalva: alkalmazott.length - kompenzalasHiba,
      };
    }
  } catch (e) {
    const kompenzalasHiba = await kompenzal(alkalmazott);
    return {
      ok: false,
      message: `Váratlan hiba (${e instanceof Error ? e.message : "ismeretlen"}); a már elvégzett tételeket visszavontuk.`,
      kompenzalva: alkalmazott.length - kompenzalasHiba,
    };
  }
  await naplozz(hatra, ref, actorId);
  return { ok: true, idempotens: false };
}

export async function kiadMuvelet(
  sorok: KiadSor[],
  ref: KeszletRef,
  actorId: string,
  opts?: MuveletOpciok,
): Promise<MuveletEredmeny> {
  await connectDB();
  const t = await tervez("kiadas", sorok, ref);
  if (!t.ok) return { ok: false, message: t.message };
  return alkalmaz(t.tervek, ref, actorId, opts);
}

export async function foglalMuvelet(
  sorok: FoglalSor[],
  ref: KeszletRef,
  actorId: string,
  opts?: MuveletOpciok,
): Promise<MuveletEredmeny> {
  await connectDB();
  const t = await tervez("foglalas", sorok, ref);
  if (!t.ok) return { ok: false, message: t.message };
  return alkalmaz(t.tervek, ref, actorId, opts);
}

export async function foglalFeloldasMuvelet(
  sorok: FoglalSor[],
  ref: KeszletRef,
  actorId: string,
  opts?: MuveletOpciok,
): Promise<MuveletEredmeny> {
  await connectDB();
  const t = await tervez("feloldas", sorok, ref);
  if (!t.ok) return { ok: false, message: t.message };
  return alkalmaz(t.tervek, ref, actorId, opts);
}

export async function bevetelMuvelet(
  sorok: BevetelSor[],
  ref: KeszletRef,
  actorId: string,
  opts?: MuveletOpciok,
): Promise<MuveletEredmeny> {
  await connectDB();
  const tervek: Terv[] = [];
  for (let i = 0; i < sorok.length; i++) {
    const l = sorok[i]!;
    if (!(l.mennyiseg > 0))
      return {
        ok: false,
        message: SOR_HIBA(i, "a mennyiségnek nullánál nagyobbnak kell lennie."),
      };
    const hely = l.raktarhelyKod ?? NINCS_HELY;
    if (!(await hellyelLetezik(hely)))
      return { ok: false, message: SOR_HIBA(i, `ismeretlen raktárhely: ${hely}.`) };
    const row = await ensureTetel(l.arlistaTermekId, hely, l.termek);
    tervek.push({
      index: i,
      kulcs: kulcsOf("bevetel", ref, i),
      tipus: "bevetel",
      row,
      dv: l.mennyiseg,
      df: 0,
      beszerzesiAr: l.beszerzesiAr,
      jegyzet: l.jegyzet,
    });
  }
  return alkalmaz(tervek, ref, actorId, opts);
}

/** Korrekció plans for an inventory taking (see `leltarLezar`). */
export async function korrekcioMuvelet(
  korrekciok: Array<{ index: number; row: Row; delta: number; jegyzet?: string }>,
  ref: KeszletRef,
  actorId: string,
  opts?: MuveletOpciok,
): Promise<MuveletEredmeny> {
  await connectDB();
  const virt: Virt = new Map();
  const tervek: Terv[] = [];
  for (let i = 0; i < korrekciok.length; i++) {
    const k = korrekciok[i]!;
    const kulcs = kulcsOf("korrekcio", ref, k.index);
    const fresh = await KeszletTetel.findById(k.row._id).lean<Row>().exec();
    if (!fresh)
      return { ok: false, message: SOR_HIBA(k.index, "a készlettétel nem található.") };
    const mar = (fresh.mozgasKulcsok ?? []).includes(kulcs);
    const v = virtOf(virt, String(fresh._id));
    if (!mar) {
      if (!ervenyes(fresh.keszlet + v.dv, fresh.foglalt + v.df, k.delta, 0)) {
        return {
          ok: false,
          message: SOR_HIBA(
            k.index,
            `a számolt mennyiség (${fresh.nev}) kisebb a foglaltnál (${fresh.foglalt} db) — előbb oldd fel a foglalást.`,
          ),
        };
      }
      virt.set(String(fresh._id), { dv: v.dv + k.delta, df: v.df });
    }
    tervek.push({
      index: k.index,
      kulcs,
      tipus: "korrekcio",
      row: fresh,
      dv: k.delta,
      df: 0,
      jegyzet: k.jegyzet,
    });
  }
  return alkalmaz(tervek, ref, actorId, opts);
}

export type { Row as KeszletSor };
