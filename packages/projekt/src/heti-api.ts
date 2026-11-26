/**
 * Heti terv (weekly plan) facade. Ownership rule enforced here, not in the UI: the owner of a
 * plan may always act on it; acting on someone else's plan, or assigning one to someone else,
 * needs `delegalhat` (the app passes whether the actor holds `projekt:hetiterv:delegal`).
 */
import { Types } from "mongoose";
import { connectDB, User } from "@erp/db-core";
import type { Ertesites, TaskRef } from "@erp/core";
import { HetiTerv, type IHetiTerv } from "./models/HetiTerv";
import { HETI_ALLAPOT_LABELS, type HetiAllapot, type Prioritas } from "./constants";
import { hetiTervJogosult } from "./szabalyok";
import {
  archivalas,
  elsoHiba,
  hiba,
  nap,
  napStr,
  ok,
  oid,
  userNev,
  validId,
  visszaallitas,
  type HetiSzereplo,
  type ProjektResult,
  type UpdateFn,
} from "./shared";
import {
  archivalasSchema,
  hetiAllapotSchema,
  hetiTervSchema,
  type HetiTervInput,
} from "./validation";

export type HetiTervSor = {
  id: string;
  cim: string;
  leiras?: string;
  ev: number;
  het: number;
  allapot: HetiAllapot;
  prioritas: Prioritas;
  hatarido?: string;
  felelosId: string;
  felelosNev: string;
  hibajegyId?: string;
  projektId?: string;
  munkalapId?: string;
  archivalt: boolean;
  archivalasOka?: string;
};

export type HetiSzuro = {
  ev: number;
  het: number;
  felelosId?: string;
  archivaltakkal?: boolean;
};

const NEM_TALALHATO = "A heti terv nem található";
const TILTVA = "Más munkatárs heti tervét csak delegálási joggal módosíthatod.";
const upd: UpdateFn = async (f, u) =>
  (await HetiTerv.updateOne(f, u).exec()).matchedCount;

function toSor(d: IHetiTerv): HetiTervSor {
  return {
    id: String(d._id),
    cim: d.cim,
    leiras: d.leiras,
    ev: d.ev,
    het: d.het,
    allapot: d.status.key as HetiAllapot,
    prioritas: d.prioritas,
    hatarido: napStr(d.hatarido),
    felelosId: d.assignee?.userId ? String(d.assignee.userId) : "",
    felelosNev: d.felelosNev,
    hibajegyId: d.hibajegyId,
    projektId: d.projektId,
    munkalapId: d.munkalapId,
    archivalt: d.archivalt,
    archivalasOka: d.archivalasOka,
  };
}

const tulajdonos = (d: { assignee?: { userId?: unknown } | null }) =>
  d.assignee?.userId ? String(d.assignee.userId) : "";

function ertesites(felelosId: string, cim: string, id: string, szereploId: string) {
  const lista: Ertesites[] =
    felelosId === szereploId
      ? []
      : [
          {
            userIds: [felelosId],
            title: "Heti tervet kaptál",
            body: cim,
            url: "/projekt/heti-terv",
            tag: `hetiterv-${id}`,
          },
        ];
  return lista;
}

export const hetiFacade = {
  async listHetiTervek(szuro: HetiSzuro): Promise<HetiTervSor[]> {
    await connectDB();
    const filter: Record<string, unknown> = { ev: szuro.ev, het: szuro.het };
    if (szuro.felelosId && validId(szuro.felelosId))
      filter["assignee.userId"] = oid(szuro.felelosId);
    if (!szuro.archivaltakkal) filter.archivalt = { $ne: true };
    const rows = await HetiTerv.find(filter).sort({ createdAt: 1 }).exec();
    return rows.map(toSor);
  },

  async getHetiTerv(id: string): Promise<HetiTervSor | null> {
    if (!validId(id)) return null;
    await connectDB();
    const d = await HetiTerv.findById(id).exec();
    return d ? toSor(d) : null;
  },

  async createHetiTerv(
    input: HetiTervInput,
    szereplo: HetiSzereplo,
  ): Promise<ProjektResult> {
    const p = hetiTervSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    if (!hetiTervJogosult(szereplo, p.data.felelosId)) return hiba(TILTVA);
    await connectDB();
    const u = validId(p.data.felelosId)
      ? await User.findById(p.data.felelosId).select("name email isActive").lean().exec()
      : null;
    if (!u || u.isActive === false) return hiba("A felelős nem található vagy inaktív.");
    const now = new Date();
    const entry = {
      key: "todo",
      changedAt: now,
      changedBy: new Types.ObjectId(szereplo.id),
    };
    const { felelosId, hatarido, ...rest } = p.data;
    const doc = await HetiTerv.create({
      ...rest,
      hatarido: nap(hatarido),
      felelosNev: userNev(u),
      letrehozoId: szereplo.id,
      status: entry,
      statusHistory: [entry],
      assignee: {
        userId: new Types.ObjectId(felelosId),
        assignedAt: now,
        assignedBy: new Types.ObjectId(szereplo.id),
      },
      notes: [],
    });
    return ok(
      String(doc._id),
      ertesites(felelosId, p.data.cim, String(doc._id), szereplo.id),
    );
  },

  async updateHetiTerv(
    id: string,
    input: HetiTervInput,
    szereplo: HetiSzereplo,
  ): Promise<ProjektResult> {
    const p = hetiTervSchema.safeParse(input);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    if (!validId(id)) return hiba(NEM_TALALHATO);
    await connectDB();
    const doc = await HetiTerv.findById(id).select("assignee archivalt").lean().exec();
    if (!doc) return hiba(NEM_TALALHATO);
    if (doc.archivalt) return hiba("Az archivált heti terv nem módosítható.");
    const regi = tulajdonos(doc);
    if (
      !hetiTervJogosult(szereplo, regi) ||
      !hetiTervJogosult(szereplo, p.data.felelosId)
    )
      return hiba(TILTVA);

    const { felelosId, hatarido, ...rest } = p.data;
    const set: Record<string, unknown> = { ...rest };
    const unset: Record<string, ""> = {};
    for (const k of ["leiras", "hibajegyId", "projektId", "munkalapId"] as const) {
      if (rest[k] === undefined) {
        delete set[k];
        unset[k] = "";
      }
    }
    if (hatarido) set.hatarido = nap(hatarido);
    else unset.hatarido = "";
    const atadva = felelosId !== regi;
    if (atadva) {
      const u = validId(felelosId)
        ? await User.findById(felelosId).select("name email isActive").lean().exec()
        : null;
      if (!u || u.isActive === false)
        return hiba("A felelős nem található vagy inaktív.");
      set.assignee = {
        userId: new Types.ObjectId(felelosId),
        assignedAt: new Date(),
        assignedBy: new Types.ObjectId(szereplo.id),
      };
      set.felelosNev = userNev(u);
    }
    // The owner is part of the filter: a concurrent re-assignment makes this a miss.
    const matched = await upd(
      { _id: oid(id), archivalt: { $ne: true }, "assignee.userId": oid(regi) },
      { $set: set, $unset: unset },
    );
    if (matched === 0)
      return hiba("A heti terv időközben megváltozott — frissítsd az oldalt.");
    return ok(id, atadva ? ertesites(felelosId, p.data.cim, id, szereplo.id) : []);
  },

  /** Quick status move (Kanban). */
  async setHetiAllapot(
    id: string,
    to: HetiAllapot,
    szereplo: HetiSzereplo,
  ): Promise<ProjektResult> {
    const p = hetiAllapotSchema.safeParse(to);
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    if (!validId(id)) return hiba(NEM_TALALHATO);
    await connectDB();
    const doc = await HetiTerv.findById(id)
      .select("assignee status archivalt")
      .lean()
      .exec();
    if (!doc) return hiba(NEM_TALALHATO);
    if (doc.archivalt) return hiba("Az archivált heti terv nem módosítható.");
    if (!hetiTervJogosult(szereplo, tulajdonos(doc))) return hiba(TILTVA);
    const from = doc.status.key;
    if (from === to) return ok(id);
    const entry = {
      key: to,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(szereplo.id),
    };
    const matched = await upd(
      { _id: oid(id), archivalt: { $ne: true }, "status.key": from },
      { $set: { status: entry }, $push: { statusHistory: entry } },
    );
    return matched === 0
      ? hiba("A heti terv állapota időközben megváltozott — frissítsd az oldalt.")
      : ok(id);
  },

  async archiveHetiTerv(id: string, okText: string, szereplo: HetiSzereplo) {
    const p = archivalasSchema.safeParse({ ok: okText });
    if (!p.success) return hiba(elsoHiba(p.error.issues));
    if (!validId(id)) return hiba(NEM_TALALHATO);
    await connectDB();
    const doc = await HetiTerv.findById(id).select("assignee").lean().exec();
    if (!doc) return hiba(NEM_TALALHATO);
    if (!hetiTervJogosult(szereplo, tulajdonos(doc))) return hiba(TILTVA);
    return archivalas(id, p.data.ok, szereplo, upd, NEM_TALALHATO);
  },

  async restoreHetiTerv(id: string, szereplo: HetiSzereplo) {
    if (!validId(id)) return hiba(NEM_TALALHATO);
    await connectDB();
    const doc = await HetiTerv.findById(id).select("assignee").lean().exec();
    if (!doc) return hiba(NEM_TALALHATO);
    if (!hetiTervJogosult(szereplo, tulajdonos(doc))) return hiba(TILTVA);
    return visszaallitas(id, upd, NEM_TALALHATO);
  },

  /** Open weekly-plan items of the user — feeds Teendőim. */
  async listMyHetiTervek(userId: string): Promise<TaskRef[]> {
    if (!validId(userId)) return [];
    await connectDB();
    const rows = await HetiTerv.find({
      "assignee.userId": userId,
      "status.key": { $ne: "kesz" },
      archivalt: { $ne: true },
    })
      .select("cim ev het status hatarido")
      .lean()
      .exec();
    return rows.map((t) => ({
      module: "projekt",
      entityType: "heti-terv",
      entityId: String(t._id),
      title: `Heti terv — ${t.cim}`,
      status: HETI_ALLAPOT_LABELS[t.status.key as HetiAllapot] ?? t.status.key,
      url: `/projekt/heti-terv?ev=${t.ev}&het=${t.het}`,
      dueDate: napStr(t.hatarido),
      kind: "task" as const,
    }));
  },
};
