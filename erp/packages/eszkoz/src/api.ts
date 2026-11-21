/**
 * Eszköz facade. State changes are explicit methods (never a diff of a PATCH) and each is one
 * conditional atomic update `updateOne({ _id, 'status.key': expected }, …)` — production Mongo is
 * a standalone without transactions, so `matchedCount === 0` means someone else won the race.
 * The movement-log entry is inserted right after a won update; the status history written in the
 * same update keeps the transition recoverable even if that insert fails.
 *
 * No permission checks here (Server Actions do that); the actor is always a parameter.
 */
import { Types } from "mongoose";
import { connectDB, User } from "@erp/db-core";
import { buildDataTableMongoQuery } from "@erp/ui";
import type { DataTableQuery } from "@erp/ui";
import type { Ertesites, TaskRef } from "@erp/core";
import { Eszkoz } from "./models/Eszkoz";
import { EszkozMozgas } from "./models/EszkozMozgas";
import { ESZKOZ_LIST_COLUMNS, type EszkozListItem } from "./columns";
import {
  ESZKOZ_ALLAPOT_LABELS,
  type EszkozAllapot,
  type FizikaiAllapot,
  type MozgasTipus,
} from "./constants";
import {
  eszkozSchema,
  kiadasSchema,
  visszavetelSchema,
  type EszkozInput,
} from "./validation";

export type EszkozResult =
  { ok: true; id?: string; ertesitesek: Ertesites[] } | { ok: false; message: string };

export type EszkozMozgasSor = {
  id: string;
  tipus: MozgasTipus;
  vegrehajtoNev: string;
  celNev?: string;
  elozoNev?: string;
  fizikaiAllapot?: FizikaiAllapot;
  jegyzet?: string;
  createdAt: string;
};

export type EszkozDetail = {
  id: string;
  megnevezes: string;
  marka?: string;
  tipusszam?: string;
  gyariSzam?: string;
  allapot: EszkozAllapot;
  fizikaiAllapot: FizikaiAllapot;
  jegyzet?: string;
  birtokosId?: string;
  birtokosNev?: string;
  mozgasok: EszkozMozgasSor[];
};

export type EszkozOsszegzes = {
  osszes: number;
  kiadva: number;
  szervizben: number;
  elveszett: number;
};

const NEM_TALALHATO = "Az eszköz nem található.";
const ELVEGZETT = "Az eszköz állapota időközben megváltozott — frissítsd az oldalt.";

function ok(id?: string, ertesitesek: Ertesites[] = []): EszkozResult {
  return { ok: true, id, ertesitesek };
}
function hiba(message: string): EszkozResult {
  return { ok: false, message };
}
const validId = (id: string) => Types.ObjectId.isValid(id);
const nev = (u: { name?: string | null; email?: string } | undefined) =>
  u?.name || u?.email || "Ismeretlen";

/**
 * Shared transition: atomically moves `id` from one of `from` to `to`, appending the status
 * history, clearing/setting the holder, then logs the movement.
 */
async function atmenet(opts: {
  id: string;
  actorId: string;
  from: readonly EszkozAllapot[];
  to: EszkozAllapot;
  tipus: MozgasTipus;
  note?: string;
  holder?: { userId: string; nev: string };
  fizikaiAllapot?: FizikaiAllapot;
}): Promise<
  { ok: true; elozoUserId?: string; megnevezes: string } | { ok: false; message: string }
> {
  if (!validId(opts.id)) return { ok: false, message: NEM_TALALHATO };
  await connectDB();
  const doc = await Eszkoz.findById(opts.id)
    .select("status assignee megnevezes")
    .lean()
    .exec();
  if (!doc) return { ok: false, message: NEM_TALALHATO };
  const current = doc.status.key as EszkozAllapot;
  if (current === "kivonva")
    return { ok: false, message: "A kivont eszközön nem végezhető művelet." };
  if (!opts.from.includes(current)) {
    return {
      ok: false,
      message: `Ez a művelet „${ESZKOZ_ALLAPOT_LABELS[current]}” állapotú eszközön nem végezhető el.`,
    };
  }

  const now = new Date();
  const entry = {
    key: opts.to,
    changedAt: now,
    changedBy: new Types.ObjectId(opts.actorId),
    ...(opts.note ? { note: opts.note } : {}),
  };
  const set: Record<string, unknown> = { status: entry };
  const unset: Record<string, ""> = {};
  if (opts.holder) {
    set.assignee = {
      userId: new Types.ObjectId(opts.holder.userId),
      assignedAt: now,
      assignedBy: new Types.ObjectId(opts.actorId),
    };
    set.birtokosNev = opts.holder.nev;
  } else {
    set.assignee = null;
    unset.birtokosNev = "";
  }
  if (opts.fizikaiAllapot) set.fizikaiAllapot = opts.fizikaiAllapot;

  // The expected state is part of the filter: of two concurrent callers exactly one matches.
  const res = await Eszkoz.updateOne(
    { _id: opts.id, "status.key": current },
    {
      $set: set,
      $push: { statusHistory: entry },
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
    },
  ).exec();
  if (res.matchedCount === 0) return { ok: false, message: ELVEGZETT };

  const elozoUserId = doc.assignee?.userId ? String(doc.assignee.userId) : undefined;
  await EszkozMozgas.create({
    eszkozId: opts.id,
    tipus: opts.tipus,
    vegrehajtoId: opts.actorId,
    celUserId: opts.holder?.userId,
    elozoUserId: opts.tipus === "kiadas" ? undefined : elozoUserId,
    fizikaiAllapot: opts.fizikaiAllapot,
    jegyzet: opts.note,
  });
  return { ok: true, elozoUserId, megnevezes: doc.megnevezes };
}

function toListItem(e: {
  _id: unknown;
  megnevezes: string;
  marka?: string;
  tipusszam?: string;
  gyariSzam?: string;
  status: { key: string };
  fizikaiAllapot: string;
  birtokosNev?: string;
  createdAt: Date;
}): EszkozListItem {
  return {
    _id: String(e._id),
    megnevezes: e.megnevezes,
    marka: e.marka,
    tipusszam: e.tipusszam,
    gyariSzam: e.gyariSzam,
    allapot: e.status.key,
    fizikaiAllapot: e.fizikaiAllapot,
    birtokosNev: e.birtokosNev,
    createdAt: e.createdAt.toISOString(),
  };
}

async function gyariSzamFoglalt(gyariSzam: string | undefined, kiveve?: string) {
  if (!gyariSzam) return false;
  const filter: Record<string, unknown> = { gyariSzam };
  if (kiveve) filter._id = { $ne: kiveve };
  return (await Eszkoz.exists(filter).exec()) !== null;
}

export const eszkozApi = {
  async listEszkozok(
    query: DataTableQuery,
  ): Promise<{ data: EszkozListItem[]; total: number }> {
    await connectDB();
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      ESZKOZ_LIST_COLUMNS,
    );
    const [rows, total] = await Promise.all([
      Eszkoz.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
      Eszkoz.countDocuments(filter).exec(),
    ]);
    return { data: rows.map(toListItem), total };
  },

  /** KPI tiles of the list: összes (kivonás nélkül), kiadva, szervizben, elveszett. */
  async getOsszegzes(): Promise<EszkozOsszegzes> {
    await connectDB();
    const rows = await Eszkoz.aggregate<{ _id: string; n: number }>([
      { $group: { _id: "$status.key", n: { $sum: 1 } } },
    ]).exec();
    const n = (k: EszkozAllapot) => rows.find((r) => r._id === k)?.n ?? 0;
    return {
      osszes: rows.reduce((s, r) => s + (r._id === "kivonva" ? 0 : r.n), 0),
      kiadva: n("kiadva"),
      szervizben: n("szervizben"),
      elveszett: n("elveszett"),
    };
  },

  async getEszkoz(id: string): Promise<EszkozDetail | null> {
    if (!validId(id)) return null;
    await connectDB();
    const doc = await Eszkoz.findById(id).lean().exec();
    if (!doc) return null;
    const mozgasok = await EszkozMozgas.find({ eszkozId: id })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const userIds = new Set<string>();
    for (const m of mozgasok) {
      for (const u of [m.vegrehajtoId, m.celUserId, m.elozoUserId])
        if (u) userIds.add(String(u));
    }
    const users = await User.find({ _id: { $in: [...userIds] } })
      .select("name email")
      .lean()
      .exec();
    const names = new Map(users.map((u) => [String(u._id), nev(u)]));
    const nameOf = (u?: Types.ObjectId) =>
      u ? (names.get(String(u)) ?? "Ismeretlen") : undefined;
    return {
      id: String(doc._id),
      megnevezes: doc.megnevezes,
      marka: doc.marka,
      tipusszam: doc.tipusszam,
      gyariSzam: doc.gyariSzam,
      allapot: doc.status.key as EszkozAllapot,
      fizikaiAllapot: doc.fizikaiAllapot,
      jegyzet: doc.jegyzet,
      birtokosId: doc.assignee?.userId ? String(doc.assignee.userId) : undefined,
      birtokosNev: doc.birtokosNev,
      mozgasok: mozgasok.map((m) => ({
        id: String(m._id),
        tipus: m.tipus,
        vegrehajtoNev: nameOf(m.vegrehajtoId) ?? "Ismeretlen",
        celNev: nameOf(m.celUserId),
        elozoNev: nameOf(m.elozoUserId),
        fizikaiAllapot: m.fizikaiAllapot,
        jegyzet: m.jegyzet,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  },

  async createEszkoz(input: EszkozInput, actorId: string): Promise<EszkozResult> {
    const parsed = eszkozSchema.safeParse(input);
    if (!parsed.success)
      return hiba(parsed.error.issues[0]?.message ?? "Érvénytelen adatok.");
    await connectDB();
    if (await gyariSzamFoglalt(parsed.data.gyariSzam))
      return hiba("Ez a gyári szám már foglalt.");
    const now = new Date();
    const entry = {
      key: "raktaron",
      changedAt: now,
      changedBy: new Types.ObjectId(actorId),
    };
    const doc = await Eszkoz.create({
      ...parsed.data,
      status: entry,
      statusHistory: [entry],
      assignee: null,
      notes: [],
    });
    return ok(String(doc._id));
  },

  /** Master data only — the state and holder change exclusively through the movement methods. */
  async updateEszkoz(id: string, input: EszkozInput): Promise<EszkozResult> {
    const parsed = eszkozSchema.safeParse(input);
    if (!parsed.success)
      return hiba(parsed.error.issues[0]?.message ?? "Érvénytelen adatok.");
    if (!validId(id)) return hiba(NEM_TALALHATO);
    await connectDB();
    if (await gyariSzamFoglalt(parsed.data.gyariSzam, id))
      return hiba("Ez a gyári szám már foglalt.");
    const d = parsed.data;
    const set: Record<string, unknown> = {
      megnevezes: d.megnevezes,
      fizikaiAllapot: d.fizikaiAllapot,
    };
    const unset: Record<string, ""> = {};
    for (const k of ["marka", "tipusszam", "gyariSzam", "jegyzet"] as const) {
      if (d[k]) set[k] = d[k];
      else unset[k] = "";
    }
    const res = await Eszkoz.updateOne(
      { _id: id, "status.key": { $ne: "kivonva" } },
      { $set: set, $unset: unset },
    ).exec();
    if (res.matchedCount === 0) {
      const exists = await Eszkoz.exists({ _id: id }).exec();
      return hiba(exists ? "A kivont eszköz nem szerkeszthető." : NEM_TALALHATO);
    }
    return ok(id);
  },

  /** raktáron → kiadva. Returns the notification for the recipient (the app sends it). */
  async checkOut(
    id: string,
    targetUserId: string,
    note: string | undefined,
    actorId: string,
  ): Promise<EszkozResult> {
    const parsed = kiadasSchema.safeParse({ celUserId: targetUserId, jegyzet: note });
    if (!parsed.success || !validId(targetUserId))
      return hiba("Válaszd ki, kinek adod ki az eszközt.");
    await connectDB();
    const target = await User.findById(targetUserId)
      .select("name email isActive")
      .lean()
      .exec();
    if (!target || target.isActive === false)
      return hiba("A címzett nem található vagy inaktív.");
    const r = await atmenet({
      id,
      actorId,
      from: ["raktaron"],
      to: "kiadva",
      tipus: "kiadas",
      note: parsed.data.jegyzet,
      holder: { userId: targetUserId, nev: nev(target) },
    });
    if (!r.ok) return hiba(r.message);
    return ok(id, [
      ...(targetUserId === actorId
        ? []
        : [
            {
              userIds: [targetUserId],
              title: "Eszközt kaptál",
              body: r.megnevezes,
              url: `/eszkoz/${id}`,
              tag: `eszkoz-${id}`,
            },
          ]),
    ]);
  },

  /** kiadva → raktáron, with the condition the tool came back in. */
  async checkIn(
    id: string,
    fizikaiAllapot: FizikaiAllapot,
    note: string | undefined,
    actorId: string,
  ): Promise<EszkozResult> {
    const parsed = visszavetelSchema.safeParse({ fizikaiAllapot, jegyzet: note });
    if (!parsed.success)
      return hiba(parsed.error.issues[0]?.message ?? "Érvénytelen adatok.");
    const r = await atmenet({
      id,
      actorId,
      from: ["kiadva"],
      to: "raktaron",
      tipus: "visszavetel",
      note: parsed.data.jegyzet,
      fizikaiAllapot: parsed.data.fizikaiAllapot,
    });
    return r.ok ? ok(id) : hiba(r.message);
  },

  /** raktáron / kiadva → szervizben (a holder's custody ends; it is logged as `elozoUserId`). */
  async startMaintenance(
    id: string,
    note: string | undefined,
    actorId: string,
  ): Promise<EszkozResult> {
    const r = await atmenet({
      id,
      actorId,
      from: ["raktaron", "kiadva"],
      to: "szervizben",
      tipus: "szerviz_kezdete",
      note: note?.trim() || undefined,
    });
    return r.ok ? ok(id) : hiba(r.message);
  },

  /** szervizben → raktáron, optionally recording the new physical condition. */
  async endMaintenance(
    id: string,
    note: string | undefined,
    actorId: string,
    fizikaiAllapot?: FizikaiAllapot,
  ): Promise<EszkozResult> {
    const r = await atmenet({
      id,
      actorId,
      from: ["szervizben"],
      to: "raktaron",
      tipus: "szerviz_vege",
      note: note?.trim() || undefined,
      fizikaiAllapot,
    });
    return r.ok ? ok(id) : hiba(r.message);
  },

  async markLost(
    id: string,
    note: string | undefined,
    actorId: string,
  ): Promise<EszkozResult> {
    const r = await atmenet({
      id,
      actorId,
      from: ["raktaron", "kiadva", "szervizben"],
      to: "elveszett",
      tipus: "elveszett",
      note: note?.trim() || undefined,
    });
    return r.ok ? ok(id) : hiba(r.message);
  },

  /** Any live state → kivonva (the archive: terminal, hidden from nothing but never deletable data). */
  async retire(
    id: string,
    note: string | undefined,
    actorId: string,
  ): Promise<EszkozResult> {
    const r = await atmenet({
      id,
      actorId,
      from: ["raktaron", "kiadva", "szervizben", "elveszett"],
      to: "kivonva",
      tipus: "kivonas",
      note: note?.trim() || undefined,
    });
    return r.ok ? ok(id) : hiba(r.message);
  },

  /** Hard delete — only while the tool has no movement history; otherwise it must be retired. */
  async deleteEszkoz(id: string): Promise<EszkozResult> {
    if (!validId(id)) return hiba(NEM_TALALHATO);
    await connectDB();
    if ((await EszkozMozgas.exists({ eszkozId: id }).exec()) !== null) {
      return hiba(
        "Az eszköznek van mozgásnaplója, ezért nem törölhető — vond ki (archiválás).",
      );
    }
    const res = await Eszkoz.deleteOne({ _id: id }).exec();
    return res.deletedCount ? ok(id) : hiba(NEM_TALALHATO);
  },

  /** Tools the user currently holds — feeds "Feladatok" as assignments. */
  async listMyAssignments(userId: string): Promise<TaskRef[]> {
    if (!validId(userId)) return [];
    await connectDB();
    const rows = await Eszkoz.find({ "assignee.userId": userId, "status.key": "kiadva" })
      .select("megnevezes marka status")
      .lean()
      .exec();
    return rows.map((e) => ({
      module: "eszkoz",
      entityType: "eszkoz",
      entityId: String(e._id),
      title: `Eszköz — ${e.megnevezes}${e.marka ? ` (${e.marka})` : ""}`,
      status: ESZKOZ_ALLAPOT_LABELS[e.status.key as EszkozAllapot] ?? e.status.key,
      url: `/eszkoz/${e._id}`,
      kind: "assignment" as const,
    }));
  },

  /** Active users for the check-out dialog. */
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
