/**
 * `feladatApi` — the Feladat facade (7e, #43; own package since 8c, #50).
 *
 * Anyone may give anyone a task — no permission key is needed to give, receive or work on one.
 * Every action is gated on the viewer's role on that task instead: the felelős accepts / refuses
 * and closes, the kiadó withdraws or — after a refusal — gives it to someone else, both comment.
 * `hr:feladat:read` only adds a read-only view of everyone's tasks.
 *
 * Linked tasks (#50): another module (through apps/erp) creates, closes or reassigns a task
 * tied to one of its entity steps with `createKapcsoltFeladat` / `lezarKapcsoltFeladatok` /
 * `atadKapcsoltFeladatot`; when the felelős closes, refuses or hands it on (or the kiadó
 * withdraws it), the hook registered for `kapcsolat.modul` is called (`hooks.ts`).
 */
import { Types } from "mongoose";
import { appendStatusChange, connectDB, Role, User } from "@erp/db-core";
import { budapestNap } from "@erp/lib/utils";
import type { TaskRef } from "@erp/core";
import {
  FELADAT_ALLAPOT_LABELS,
  FELADAT_CIM_MAX,
  FELADAT_CSOPORT_MAX,
  FELADAT_LEPES_MAX,
  FELADAT_LEPES_NEV_MAX,
  FELADAT_NYITOTT_ALLAPOTOK,
  FELADAT_PERMISSIONS,
  FELADAT_PRIORITAS_LABELS,
  FELADAT_SZOVEG_MAX,
  LEPES_SABLON_MAX,
  type FeladatAllapot,
  type FeladatKapcsolat,
  type FeladatNezetSzuro,
  type FeladatPrioritas,
  type FeladatViewer,
} from "./constants";
import { Feladat, type IFeladat } from "./models/Feladat";
import { LepesSablon } from "./models/LepesSablon";
import { fireKapcsoltFeladatHook, type KapcsoltFeladatEsemeny } from "./hooks";
import { csoportHaladas } from "./egyseg";
import { csoportStatisztika, kapcsolatKategoria, type KategoriaTetel } from "./kategoria";
import { kategoriaAdminApi, kategoriaFeloldas, kategoriaHiba } from "./kategoria-lista";
import type {
  FeladatCimzett,
  FeladatCsoportTag,
  FeladatErtesitesCel,
  FeladatKimutatas,
  FeladatKimutatasSor,
  FeladatSor,
} from "./types";

export type {
  FeladatCimzett,
  FeladatCsoportTag,
  FeladatErtesitesCel,
  FeladatKimutatas,
  FeladatKimutatasSor,
  FeladatSor,
} from "./types";

function can(viewer: FeladatViewer, key: string): boolean {
  return viewer.permissions.includes(key);
}

/** Waiting for acceptance longer than this counts as stuck. */
export const ELFOGADAS_ELAKADT_NAP = 3;

type Result = { ok: boolean; message?: string; feladat?: FeladatErtesitesCel };

function celOf(f: IFeladat): FeladatErtesitesCel {
  return {
    id: String(f._id),
    cim: f.cim,
    kiadoId: String(f.kiadoId),
    felelosId: f.assignee?.userId ? String(f.assignee.userId) : undefined,
    felelosNev: f.felelosNev,
    sajat: Boolean(f.sajat),
  };
}

const NINCS = "A feladat nem található";
const LEZART = "A feladat már le van zárva";

const NAP_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` → UTC midnight, or null when it is not a real calendar day. */
function parseHatarido(nap: string): Date | null {
  if (!NAP_RE.test(nap)) return null;
  const d = new Date(`${nap}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== nap ? null : d;
}

function hataridoHiba(nap: string): string | null {
  if (!parseHatarido(nap)) return "Adj meg érvényes határidőt";
  if (nap < budapestNap(new Date())) return "A határidő nem lehet a múltban";
  return null;
}

function allapotOf(f: IFeladat): FeladatAllapot {
  return f.status.key as FeladatAllapot;
}

function isKiado(f: IFeladat, viewer: FeladatViewer): boolean {
  return String(f.kiadoId) === viewer.userId;
}

function isFelelos(f: IFeladat, viewer: FeladatViewer): boolean {
  return Boolean(f.assignee?.userId && String(f.assignee.userId) === viewer.userId);
}

function isKorabbiFelelos(f: IFeladat, viewer: FeladatViewer): boolean {
  return (f.korabbiFelelosIds ?? []).some((id) => String(id) === viewer.userId);
}

/**
 * Who may open a task (its page, its attachments): the kiadó, the felelős, an earlier felelős
 * along the handover chain, another member of the same group task (közreműködő), or
 * `hr:feladat:read`.
 */
async function mayView(f: IFeladat, viewer: FeladatViewer): Promise<boolean> {
  if (isKiado(f, viewer) || isFelelos(f, viewer) || isKorabbiFelelos(f, viewer))
    return true;
  if (can(viewer, FELADAT_PERMISSIONS.read)) return true;
  return isCsoporttag(f, viewer);
}

async function isCsoporttag(f: IFeladat, viewer: FeladatViewer): Promise<boolean> {
  if (!f.csoportId || !Types.ObjectId.isValid(viewer.userId)) return false;
  return Boolean(
    await Feladat.exists({
      csoportId: f.csoportId,
      "assignee.userId": viewer.userId,
    }).exec(),
  );
}

function isNyitott(f: IFeladat): boolean {
  return FELADAT_NYITOTT_ALLAPOTOK.includes(allapotOf(f));
}

function muveletek(f: IFeladat, viewer: FeladatViewer): FeladatSor["muveletek"] {
  const a = allapotOf(f);
  const kiado = isKiado(f, viewer);
  const felelos = isFelelos(f, viewer);
  return {
    dont: felelos && a === "kiadva" && !f.sajat,
    lezar: felelos && a === "elfogadva",
    visszavon: kiado && isNyitott(f),
    ujrakiad: kiado && a === "elutasitva" && !f.sajat,
    megjegyzes: (kiado || felelos) && isNyitott(f),
    tovabbad: felelos && (a === "kiadva" || a === "elfogadva") && !f.sajat,
    lepesek: felelos && (a === "kiadva" || a === "elfogadva"),
    kezel: kiado && isNyitott(f),
  };
}

function aktualisLepes(f: Pick<IFeladat, "lepesek">): FeladatSor["aktualisLepes"] {
  const lepesek = f.lepesek ?? [];
  const i = lepesek.findIndex((l) => !l.kesz);
  if (i < 0) return undefined;
  return { nev: lepesek[i]!.nev, sorszam: i + 1, osszes: lepesek.length };
}

/** The status line of a task: the state, plus the current step when it has steps. */
function allapotSzoveg(f: Pick<IFeladat, "lepesek" | "status">): string {
  const cimke = FELADAT_ALLAPOT_LABELS[f.status.key as FeladatAllapot];
  const l = aktualisLepes(f);
  return l && f.status.key === "elfogadva"
    ? `${cimke} · ${l.sorszam}/${l.osszes} ${l.nev}`
    : cimke;
}

function kapcsolatOf(f: Pick<IFeladat, "kapcsolat">): FeladatKapcsolat | undefined {
  const k = f.kapcsolat;
  return k
    ? {
        modul: k.modul,
        tipus: k.tipus,
        id: k.id,
        szakasz: k.szakasz,
        url: k.url,
        cimke: k.cimke,
      }
    : undefined;
}

/** Calls the owning module back after a linked task's state was saved. */
async function kapcsoltEsemeny(
  f: IFeladat,
  tipus: KapcsoltFeladatEsemeny["tipus"],
  actorId: string,
  extra: Partial<KapcsoltFeladatEsemeny> = {},
): Promise<void> {
  const kapcsolat = kapcsolatOf(f);
  if (!kapcsolat) return;
  await fireKapcsoltFeladatHook({
    tipus,
    feladatId: String(f._id),
    kapcsolat,
    actorId,
    ...extra,
  });
}

function idk(ids: Types.ObjectId[] | undefined): string[] {
  return (ids ?? []).map(String);
}

/** Every attachment on the task (with the task and on comments) — for the media usage sync. */
export function feladatMediaIdk(
  f: Pick<IFeladat, "mediaIds" | "megjegyzesMediaIds">,
): string[] {
  return [
    ...new Set([
      ...idk(f.mediaIds),
      ...(f.megjegyzesMediaIds ?? []).flatMap((m) => idk(m.mediaIds)),
    ]),
  ];
}

async function activeUser(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return User.findOne({ _id: id, isActive: { $ne: false } })
    .select("name email")
    .lean()
    .exec();
}

function userNev(u: { name?: string; email: string }): string {
  return u.name || u.email;
}

async function nevek(ids: Array<Types.ObjectId | string>): Promise<Map<string, string>> {
  const egyedi = [...new Set(ids.map(String))].filter((id) => Types.ObjectId.isValid(id));
  if (egyedi.length === 0) return new Map();
  const users = await User.find({ _id: { $in: egyedi } })
    .select("name email")
    .lean()
    .exec();
  return new Map(users.map((u) => [String(u._id), userNev(u)]));
}

function toSor(
  f: IFeladat,
  viewer: FeladatViewer,
  nevById: Map<string, string>,
  ma: string,
  csoportok: Map<string, FeladatCsoportTag[]>,
): FeladatSor {
  const allapot = allapotOf(f);
  const hatarido = f.hatarido.toISOString().slice(0, 10);
  const kiadoId = String(f.kiadoId);
  const megjegyzesMedia = new Map(
    (f.megjegyzesMediaIds ?? []).map((m) => [m.megjegyzes, idk(m.mediaIds)]),
  );
  const mindenkinek = new Set(f.csoportMegjegyzesek ?? []);
  const csoportTagok = f.csoportId ? (csoportok.get(String(f.csoportId)) ?? []) : [];
  const szerep: FeladatSor["szerep"] = isKiado(f, viewer)
    ? "kiado"
    : isFelelos(f, viewer)
      ? "felelos"
      : f.csoportId && csoportTagok.some((t) => t.felelosId === viewer.userId)
        ? "kozremukodo"
        : "megfigyelo";
  return {
    id: String(f._id),
    cim: f.cim,
    leiras: f.leiras,
    hatarido,
    allapot,
    kesik: kesikE(allapot, hatarido, ma),
    kiadoId,
    kiadoNev: f.kiadoNev,
    felelosNev: f.felelosNev,
    createdAt: f.createdAt.toISOString(),
    prioritas: f.prioritas ?? "normal",
    elsodleges: f.csoportId ? Boolean(f.elsodleges) : undefined,
    mediaIds: idk(f.mediaIds),
    megjegyzesek: (f.notes ?? []).map((n, i) => ({
      szerzoNev: nevById.get(String(n.authorId)),
      kiadotol: String(n.authorId) === kiadoId,
      szoveg: n.text,
      mikor: n.createdAt.toISOString(),
      mediaIds: megjegyzesMedia.get(i) ?? [],
      ...(mindenkinek.has(i) ? { mindenkinek: true } : {}),
    })),
    naplo: (f.statusHistory ?? []).map((s) => ({
      allapot: s.key as FeladatAllapot,
      kiNev: nevById.get(String(s.changedBy)),
      mikor: s.changedAt.toISOString(),
      megjegyzes: s.note,
    })),
    szerep,
    sajat: Boolean(f.sajat),
    csoport: f.csoportId
      ? {
          id: String(f.csoportId),
          tagok: csoportTagok,
          haladas: csoportHaladas(csoportTagok),
        }
      : undefined,
    elozmenyId: f.elozmenyId ? String(f.elozmenyId) : undefined,
    kovetkezoId: f.kovetkezoId ? String(f.kovetkezoId) : undefined,
    kapcsolat: kapcsolatOf(f),
    kategoria: f.kategoria,
    lepesek: (f.lepesek ?? []).map((l) => ({
      nev: l.nev,
      kesz: Boolean(l.kesz),
      hatarido: l.hatarido ? l.hatarido.toISOString().slice(0, 10) : undefined,
    })),
    aktualisLepes: aktualisLepes(f),
    muveletek: muveletek(f, viewer),
  };
}

function kesikE(allapot: FeladatAllapot, hatarido: string, ma: string): boolean {
  return (allapot === "kiadva" || allapot === "elfogadva") && hatarido < ma;
}

/**
 * Every member of the given groups (8m): state, steps, latest comment, handover links — what the
 * kiadó's group row and the recipients' "who else is on it" strip show. Primary first, then by
 * name; handed-on and withdrawn copies last.
 */
async function csoportTagjai(
  csoportIds: string[],
  ma: string,
): Promise<Map<string, FeladatCsoportTag[]>> {
  const csoportok = new Map<string, FeladatCsoportTag[]>();
  if (csoportIds.length === 0) return csoportok;
  const tagok = await Feladat.find({ csoportId: { $in: csoportIds } })
    .select({
      csoportId: 1,
      felelosNev: 1,
      status: 1,
      elsodleges: 1,
      assignee: 1,
      hatarido: 1,
      lepesek: 1,
      sajat: 1,
      elozmenyId: 1,
      kovetkezoId: 1,
      notes: { $slice: -1 },
    })
    .lean()
    .exec();
  const nevById = await nevek(
    tagok.flatMap((t) => (t.notes ?? []).map((n) => n.authorId)),
  );
  const hatul = (a: FeladatAllapot) =>
    a === "tovabbadva" || a === "visszavonva" ? 1 : 0;
  for (const t of tagok) {
    const k = String(t.csoportId);
    const lista = csoportok.get(k) ?? [];
    const allapot = t.status.key as FeladatAllapot;
    const hatarido = t.hatarido.toISOString().slice(0, 10);
    const lepesek = t.lepesek ?? [];
    const utolso = (t.notes ?? []).at(-1);
    lista.push({
      id: String(t._id),
      felelosId: t.assignee?.userId ? String(t.assignee.userId) : undefined,
      felelosNev: t.felelosNev,
      allapot,
      elsodleges: Boolean(t.elsodleges),
      hatarido,
      kesik: kesikE(allapot, hatarido, ma),
      lepesKesz: lepesek.filter((l) => l.kesz).length,
      lepesOsszes: lepesek.length,
      aktualisLepes: aktualisLepes(t)?.nev,
      utolsoMegjegyzes: utolso
        ? {
            szerzoNev: nevById.get(String(utolso.authorId)),
            szoveg: utolso.text,
            mikor: utolso.createdAt.toISOString(),
          }
        : undefined,
      kovetkezoId: t.kovetkezoId ? String(t.kovetkezoId) : undefined,
      elozmenyId: t.elozmenyId ? String(t.elozmenyId) : undefined,
      sajat: Boolean(t.sajat),
    });
    csoportok.set(k, lista);
  }
  for (const lista of csoportok.values())
    lista.sort(
      (a, b) =>
        hatul(a.allapot) - hatul(b.allapot) ||
        Number(b.elsodleges) - Number(a.elsodleges) ||
        a.felelosNev.localeCompare(b.felelosNev, "hu"),
    );
  return csoportok;
}

async function toSorok(rows: IFeladat[], viewer: FeladatViewer): Promise<FeladatSor[]> {
  const nevById = await nevek(
    rows.flatMap((f) => [
      ...(f.notes ?? []).map((n) => n.authorId),
      ...(f.statusHistory ?? []).map((s) => s.changedBy),
    ]),
  );
  const ma = budapestNap(new Date());
  const csoportIds = [
    ...new Set(rows.flatMap((f) => (f.csoportId ? [String(f.csoportId)] : []))),
  ];
  const csoportok = await csoportTagjai(csoportIds, ma);
  return rows.map((f) => toSor(f, viewer, nevById, ma, csoportok));
}

function kapcsoltSzuro(k: {
  modul: string;
  tipus: string;
  id: string;
  szakasz?: string;
}): Record<string, unknown> {
  return {
    "kapcsolat.modul": k.modul,
    "kapcsolat.tipus": k.tipus,
    "kapcsolat.id": k.id,
    ...(k.szakasz ? { "kapcsolat.szakasz": k.szakasz } : {}),
  };
}

async function findFeladat(id: string): Promise<IFeladat | null> {
  return Types.ObjectId.isValid(id) ? Feladat.findById(id).exec() : null;
}

function cleanSzoveg(szoveg: string | undefined): string | undefined {
  const s = szoveg?.trim();
  return s ? s.slice(0, FELADAT_SZOVEG_MAX) : undefined;
}

/**
 * "Saját feladataim": tasks waiting on this user as felelős (to accept, or to finish), and the
 * ones they gave out that came back refused — the kiadó has to decide what happens next.
 * Tagged `module: 'feladat'`, not `hr` — a cross-cutting feature (#43) that only shares the feed.
 */
export async function feladatAssignments(userId: string): Promise<TaskRef[]> {
  if (!Types.ObjectId.isValid(userId)) return [];
  const [kapott, elutasitott] = await Promise.all([
    Feladat.find({
      "assignee.userId": userId,
      "status.key": { $in: ["kiadva", "elfogadva"] },
    })
      .sort({ hatarido: 1 })
      .lean()
      .exec(),
    Feladat.find({ kiadoId: userId, "status.key": "elutasitva" })
      .sort({ updatedAt: -1 })
      .lean()
      .exec(),
  ]);
  return [
    ...kapott.map((f) => ({
      module: "feladat",
      entityType: f.sajat ? "feladat-sajat" : "feladat",
      entityId: String(f._id),
      title: f.sajat
        ? `Saját feladat: ${f.cim}`
        : `Feladat: ${f.cim} — ${f.kiadoNev} adta`,
      status: allapotSzoveg(f),
      url: `/feladatok/${f._id}`,
      dueDate: f.hatarido.toISOString(),
    })),
    ...elutasitott.map((f) => ({
      module: "feladat",
      entityType: "feladat-elutasitva",
      entityId: String(f._id),
      title: `Elutasított feladat: ${f.cim} — ${f.felelosNev} — add ki másnak vagy vond vissza`,
      status: FELADAT_ALLAPOT_LABELS.elutasitva,
      url: `/feladatok/${f._id}`,
      dueDate: f.hatarido.toISOString(),
    })),
  ];
}

/**
 * The handover itself (#49): closes `f` as `tovabbadva` and creates the copy that waits for the
 * new felelős — same kiadó, deadline, priority, attachments, comments, log, steps and link.
 */
async function tovabbadPeldany(
  f: IFeladat,
  atadoUserId: string,
  cel: { _id: Types.ObjectId; name?: string; email: string },
  indok: string,
): Promise<IFeladat> {
  const celNev = userNev(cel);
  const vissza = String(cel._id) === String(f.kiadoId);
  const most = new Date();
  const atadoId = new Types.ObjectId(atadoUserId);
  const lanc = `${f.felelosNev} → ${celNev}${vissza ? " (vissza a kiadónak)" : ""}: ${indok}`;
  const elozoFelelos = f.assignee?.userId;
  const uj = new Feladat({
    cim: f.cim,
    leiras: f.leiras,
    hatarido: f.hatarido,
    kiadoId: f.kiadoId,
    kiadoNev: f.kiadoNev,
    felelosNev: celNev,
    csoportId: f.csoportId,
    prioritas: f.prioritas,
    elsodleges: f.elsodleges,
    mediaIds: f.mediaIds,
    megjegyzesMediaIds: f.megjegyzesMediaIds,
    csoportMegjegyzesek: f.csoportMegjegyzesek,
    notes: f.notes,
    statusHistory: f.statusHistory,
    kapcsolat: f.kapcsolat,
    kategoria: f.kategoria,
    kategoriaKulcs: f.kategoriaKulcs,
    lepesek: f.lepesek,
    elozmenyId: f._id,
    korabbiFelelosIds: [
      ...(f.korabbiFelelosIds ?? []),
      ...(elozoFelelos ? [elozoFelelos] : []),
    ],
    assignee: { userId: cel._id, assignedAt: most, assignedBy: atadoId },
  });
  appendStatusChange(uj, "kiadva", atadoId, `Továbbadva: ${lanc}`);
  f.kovetkezoId = uj._id;
  appendStatusChange(f, "tovabbadva", atadoId, `Továbbadva: ${lanc}`);
  await uj.save();
  await f.save();
  return uj;
}

type CsoportEredmeny = {
  ok: boolean;
  message?: string;
  /** How many copies changed. */
  db: number;
  /** The changed copies — the actions push their felelős. */
  celok: FeladatErtesitesCel[];
};

/** Only the kiadó manages a task, and only while something of it is still open. */
async function kezeloHiba(
  f: IFeladat | null,
  viewer: FeladatViewer,
): Promise<string | null> {
  if (!f || !(isKiado(f, viewer) || (await mayView(f, viewer)))) return NINCS;
  if (!isKiado(f, viewer)) return "Csak a kiadó kezelheti a feladatot";
  if (f.csoportId) {
    const nyitott = await Feladat.exists({
      csoportId: f.csoportId,
      "status.key": { $in: FELADAT_NYITOTT_ALLAPOTOK },
    }).exec();
    return nyitott ? null : LEZART;
  }
  return isNyitott(f) ? null : LEZART;
}

/** The open copies of the task's group — or the task itself (when open). */
async function nyitottPeldanyok(f: IFeladat, csakEz = false): Promise<IFeladat[]> {
  if (!f.csoportId || csakEz) return isNyitott(f) ? [f] : [];
  return Feladat.find({
    csoportId: f.csoportId,
    "status.key": { $in: FELADAT_NYITOTT_ALLAPOTOK },
  })
    .sort({ createdAt: 1 })
    .exec();
}

/**
 * A log line that does not change the state (deadline / priority change, new primary): the
 * same state again, with the note.
 */
function naploSor(f: IFeladat, kiId: string, megjegyzes: string): void {
  appendStatusChange(f, allapotOf(f), kiId, megjegyzes);
}

const napSzoveg = (ymd: string) => `${ymd.replaceAll("-", ". ")}.`;

export const feladatApi = {
  /** "Teendőim" feed part (`TaskRef`, module `feladat`) — merged with every module's in apps/erp. */
  async listMyAssignments(userId: string): Promise<TaskRef[]> {
    await connectDB();
    return feladatAssignments(userId);
  },

  /**
   * Who a task can go to: every active account except the viewer's own (an own task is picked
   * separately), with their role names so a group task can be given to a whole role at once.
   */
  async listFeladatCimzettek(viewer: FeladatViewer): Promise<FeladatCimzett[]> {
    await connectDB();
    const query: Record<string, unknown> = { isActive: { $ne: false } };
    if (Types.ObjectId.isValid(viewer.userId)) query._id = { $ne: viewer.userId };
    const [users, roles] = await Promise.all([
      User.find(query).select("name email roleIds").lean().exec(),
      Role.find({}).select("name").lean().exec(),
    ]);
    const roleNev = new Map(roles.map((r) => [String(r._id), r.name]));
    return users
      .map((u) => ({
        id: String(u._id),
        nev: userNev(u),
        szerepkorok: (u.roleIds ?? []).flatMap((r) => {
          const n = roleNev.get(String(r));
          return n ? [n] : [];
        }),
      }))
      .sort((a, b) => a.nev.localeCompare(b.nev, "hu"));
  },

  /** The selectable categories (admin list, active ones, list order) — the category pickers. */
  async listKategoriak(): Promise<Array<{ nev: string }>> {
    await connectDB();
    return (await kategoriaAdminApi.listAktiv()).map((nev) => ({ nev }));
  },

  /**
   * Gives a task to one or more people with a deadline. Several recipients make a group task:
   * everyone gets their own copy (accepts, works on and closes it alone), linked by `csoportId`.
   * The viewer's own id among them makes an own task, which skips the acceptance step.
   */
  async createFeladat(
    viewer: FeladatViewer,
    input: {
      felelosIds: string[];
      cim: string;
      leiras?: string;
      hatarido: string;
      prioritas?: FeladatPrioritas;
      /** Group task: the primary felelős, one of `felelosIds` (#48). */
      elsodlegesId?: string;
      /** Protected media ids, already checked by the caller (attachable by this user). */
      mediaIds?: string[];
      /** Free category (#65) — on every copy of a group. */
      kategoria?: string;
      /** Module-created tasks: accept a retired category too. */
      kategoriaRendszer?: boolean;
    },
  ): Promise<{
    id: string;
    db: number;
    /** One copy per recipient — for per-person push links and the media usage sync. */
    peldanyok?: Array<{ id: string; felelosId: string }>;
    message?: string;
  }> {
    await connectDB();
    const kiado = await activeUser(viewer.userId);
    if (!kiado) return { id: "", db: 0, message: "A fiókod nem található" };
    const cim = input.cim.trim();
    if (!cim || cim.length > FELADAT_CIM_MAX)
      return {
        id: "",
        db: 0,
        message: "Add meg röviden a feladatot (legfeljebb 200 karakter)",
      };
    const ids = [...new Set(input.felelosIds)];
    if (ids.length === 0)
      return { id: "", db: 0, message: "Válaszd ki, kinek adod a feladatot" };
    if (ids.length > FELADAT_CSOPORT_MAX)
      return {
        id: "",
        db: 0,
        message: `Egyszerre legfeljebb ${FELADAT_CSOPORT_MAX} embernek adhatod ki`,
      };
    const hiba = hataridoHiba(input.hatarido);
    if (hiba) return { id: "", db: 0, message: hiba };
    const felelosok = Types.ObjectId.isValid(viewer.userId)
      ? await User.find({
          _id: { $in: ids.filter((id) => Types.ObjectId.isValid(id)) },
          isActive: { $ne: false },
        })
          .select("name email")
          .lean()
          .exec()
      : [];
    if (felelosok.length !== ids.length)
      return { id: "", db: 0, message: "Válaszd ki, kinek adod a feladatot" };
    if (input.elsodlegesId && !ids.includes(input.elsodlegesId))
      return { id: "", db: 0, message: "Az elsődleges felelős a címzettek közül legyen" };

    const most = new Date();
    const hatarido = parseHatarido(input.hatarido)!;
    const leiras = cleanSzoveg(input.leiras);
    const csoportId = felelosok.length > 1 ? new Types.ObjectId() : undefined;
    const kiadoNev = userNev(kiado);
    const prioritas =
      input.prioritas && input.prioritas !== "normal" ? input.prioritas : undefined;
    const mediaIds = (input.mediaIds ?? [])
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const kategoria = await kategoriaFeloldas(input.kategoria, input.kategoriaRendszer);
    if (kategoriaHiba(kategoria)) return { id: "", db: 0, message: kategoria.hiba };
    const docs = felelosok.map((felelos) => {
      const sajat = String(felelos._id) === String(kiado._id);
      const f = new Feladat({
        cim,
        leiras,
        hatarido,
        kiadoId: kiado._id,
        kiadoNev,
        felelosNev: userNev(felelos),
        sajat: sajat || undefined,
        csoportId,
        prioritas,
        elsodleges:
          csoportId && input.elsodlegesId === String(felelos._id) ? true : undefined,
        mediaIds: mediaIds.length ? mediaIds : undefined,
        ...kategoria,
        assignee: { userId: felelos._id, assignedAt: most, assignedBy: kiado._id },
      });
      if (sajat) appendStatusChange(f, "elfogadva", kiado._id, "Saját feladat");
      else appendStatusChange(f, "kiadva", kiado._id);
      return f;
    });
    await Feladat.insertMany(docs);
    return {
      id: String(docs[0]!._id),
      db: docs.length,
      peldanyok: docs.map((d) => ({
        id: String(d._id),
        felelosId: String(d.assignee!.userId),
      })),
    };
  },

  /**
   * `nezet`: `kapott` (I am the felelős), `kiadott` (I gave it), `mind` — everyone's with
   * `hr:feladat:read`, otherwise both of the viewer's own lists together. `allapot`: `nyitott`
   * (still waiting on someone), `lezart` (kész / visszavonva) or `mind`.
   */
  async listFeladatok(
    viewer: FeladatViewer,
    szuro: { nezet?: FeladatNezetSzuro; allapot?: "nyitott" | "lezart" | "mind" } = {},
  ): Promise<FeladatSor[]> {
    await connectDB();
    if (!Types.ObjectId.isValid(viewer.userId)) return [];
    const query: Record<string, unknown> = {};
    const nezet = szuro.nezet ?? "kapott";
    if (nezet === "kapott") query["assignee.userId"] = viewer.userId;
    else if (nezet === "kiadott") {
      // Own tasks live in "Teendőim"; here only what went to others.
      query.kiadoId = viewer.userId;
      query.sajat = { $ne: true };
    } else if (!can(viewer, FELADAT_PERMISSIONS.read)) {
      query.$or = [{ "assignee.userId": viewer.userId }, { kiadoId: viewer.userId }];
    }
    if (szuro.allapot === "nyitott")
      query["status.key"] = { $in: FELADAT_NYITOTT_ALLAPOTOK };
    if (szuro.allapot === "lezart")
      query["status.key"] = { $nin: FELADAT_NYITOTT_ALLAPOTOK };
    const sort: Record<string, 1 | -1> =
      szuro.allapot === "nyitott" ? { hatarido: 1, createdAt: 1 } : { createdAt: -1 };
    const rows = await Feladat.find(query).sort(sort).limit(500).exec();
    return toSorok(rows, viewer);
  },

  /**
   * One task for its own page (`/feladatok/[id]`): the kiadó, the felelős, or anyone with
   * `hr:feladat:read` (read-only) — everyone else gets null, same as a missing id.
   */
  async getFeladat(viewer: FeladatViewer, id: string): Promise<FeladatSor | null> {
    await connectDB();
    const f = await findFeladat(id);
    if (!f || !(await mayView(f, viewer))) return null;
    const [sor] = await toSorok([f], viewer);
    return sor ?? null;
  },

  /**
   * Task KPIs for managers (`hr:feladat:read`): per person, how many tasks they got and from
   * whom, how many are done (on time), open, overdue or stuck (overdue, or not accepted within
   * ELFOGADAS_ELAKADT_NAP days); per giver how many they gave. `napok` limits to tasks given in
   * the last N days (open ones always count).
   */
  async getFeladatKimutatas(
    viewer: FeladatViewer,
    napok?: number,
  ): Promise<FeladatKimutatas | null> {
    await connectDB();
    if (!can(viewer, FELADAT_PERMISSIONS.read)) return null;
    const query: Record<string, unknown> = {};
    if (napok && napok > 0) {
      const tol = new Date(Date.now() - napok * 86_400_000);
      query.$or = [
        { createdAt: { $gte: tol } },
        { "status.key": { $in: FELADAT_NYITOTT_ALLAPOTOK } },
      ];
    }
    const rows = await Feladat.find(query)
      .select(
        "cim hatarido kiadoId kiadoNev felelosNev sajat assignee status statusHistory createdAt csoportId elsodleges prioritas kategoria",
      )
      .lean()
      .exec();
    const ma = budapestNap(new Date());
    const most = Date.now();
    const napKul = (a: number, b: number) =>
      Math.max(0, Math.round((b - a) / 86_400_000));

    const sorok = new Map<
      string,
      FeladatKimutatasSor & {
        _napok: number[];
        _kiadok: Map<string, { db: number; kesz: number }>;
      }
    >();
    const kiadok = new Map<
      string,
      {
        nev: string;
        kiadott: number;
        kesz: number;
        lejart: number;
        _egysegek: Set<string>;
      }
    >();
    // Per task (8m): a group task once — with how many of its counted copies are done.
    const egysegek = new Set<string>();
    const csoportok = new Map<string, { aktiv: number; kesz: number }>();
    const csoportosEgysegek = new Set<string>();
    const osszNapok: number[] = [];
    // Group stats (#65) — the same copies as the totals (own tasks left out).
    const tetelek: KategoriaTetel[] = [];
    let osszes = 0,
      nyitott = 0,
      lejart = 0,
      elakadt = 0,
      kesz = 0,
      hataridoreKesz = 0;

    for (const f of rows) {
      const uid = f.assignee?.userId ? String(f.assignee.userId) : "";
      if (!uid) continue;
      let sor = sorok.get(uid);
      if (!sor) {
        sor = {
          userId: uid,
          nev: f.felelosNev,
          kapott: 0,
          elfogadasraVar: 0,
          folyamatban: 0,
          kesz: 0,
          hataridoreKesz: 0,
          elutasitott: 0,
          visszavont: 0,
          tovabbadott: 0,
          kozremukodo: 0,
          lejart: 0,
          elakadt: 0,
          sajat: 0,
          sajatKesz: 0,
          kiadok: [],
          nyitottak: [],
          _napok: [],
          _kiadok: new Map(),
        };
        sorok.set(uid, sor);
      }
      const a = f.status.key as FeladatAllapot;
      const hatarido = f.hatarido.toISOString().slice(0, 10);
      if (f.sajat) {
        sor.sajat++;
        if (a === "lezarva") sor.sajatKesz++;
        continue;
      }
      {
        const lez =
          a === "lezarva"
            ? [...(f.statusHistory ?? [])].reverse().find((h) => h.key === "lezarva")
                ?.changedAt
            : undefined;
        tetelek.push({
          kategoria: f.kategoria,
          felelosNev: f.felelosNev,
          kiadoNev: f.kiadoNev,
          allapot: a,
          hatarido,
          createdAt: f.createdAt,
          lezarva: lez,
          lezarvaNap: lez ? budapestNap(lez) : undefined,
        });
      }
      // A handed-on copy counts for the person (they got it, passed it on), not again for the
      // kiadó or the totals — the copy it became carries the task from there.
      if (a === "tovabbadva") {
        sor.kapott++;
        sor.tovabbadott++;
        continue;
      }
      osszes++;
      sor.kapott++;
      const nyitva = a === "kiadva" || a === "elfogadva";
      const kesik = nyitva && hatarido < ma;
      const kiadvaOta = napKul(f.createdAt.getTime(), most);
      const megakadt = kesik || (a === "kiadva" && kiadvaOta > ELFOGADAS_ELAKADT_NAP);
      const k = kiadok.get(String(f.kiadoId)) ?? {
        nev: f.kiadoNev,
        kiadott: 0,
        kesz: 0,
        lejart: 0,
        _egysegek: new Set<string>(),
      };
      k.kiadott++;
      const egysegKulcs = String(f.csoportId ?? f._id);
      egysegek.add(egysegKulcs);
      k._egysegek.add(egysegKulcs);
      if (f.csoportId) csoportosEgysegek.add(egysegKulcs);
      if (f.csoportId && a !== "visszavonva") {
        const cs = csoportok.get(egysegKulcs) ?? { aktiv: 0, kesz: 0 };
        cs.aktiv++;
        if (a === "lezarva") cs.kesz++;
        csoportok.set(egysegKulcs, cs);
      }
      const sk = sor._kiadok.get(f.kiadoNev) ?? { db: 0, kesz: 0 };
      sk.db++;
      if (a === "kiadva") sor.elfogadasraVar++;
      if (a === "elfogadva") sor.folyamatban++;
      if (a === "elutasitva") sor.elutasitott++;
      if (a === "visszavonva") sor.visszavont++;
      if (f.csoportId && !f.elsodleges) sor.kozremukodo++;
      if (nyitva) {
        nyitott++;
        sor.nyitottak.push({
          id: String(f._id),
          cim: f.cim,
          kiadoNev: f.kiadoNev,
          hatarido,
          allapot: a,
          kesik,
          elakadt: megakadt,
          nap: kiadvaOta,
          prioritas: f.prioritas ?? "normal",
          elsodleges: f.csoportId ? Boolean(f.elsodleges) : undefined,
        });
      }
      if (kesik) {
        lejart++;
        sor.lejart++;
        k.lejart++;
      }
      if (megakadt) {
        elakadt++;
        sor.elakadt++;
      }
      if (a === "lezarva") {
        kesz++;
        sor.kesz++;
        k.kesz++;
        sk.kesz++;
        const lezaras = [...(f.statusHistory ?? [])]
          .reverse()
          .find((h) => h.key === "lezarva");
        if (lezaras) {
          const d = napKul(f.createdAt.getTime(), lezaras.changedAt.getTime());
          sor._napok.push(d);
          osszNapok.push(d);
          if (budapestNap(lezaras.changedAt) <= hatarido) {
            hataridoreKesz++;
            sor.hataridoreKesz++;
          }
        }
      }
      kiadok.set(String(f.kiadoId), k);
      sor._kiadok.set(f.kiadoNev, sk);
    }

    const atlag = (xs: number[]) =>
      xs.length
        ? Math.round((xs.reduce((x, y) => x + y, 0) / xs.length) * 10) / 10
        : undefined;
    return {
      osszes,
      feladatok: {
        osszes: egysegek.size,
        csoportos: csoportosEgysegek.size,
        csoportosKesz: [...csoportok.values()].filter(
          (c) => c.aktiv > 0 && c.kesz === c.aktiv,
        ).length,
      },
      nyitott,
      lejart,
      elakadt,
      kesz,
      hataridoreKesz,
      atlagNap: atlag(osszNapok),
      csoportok: {
        kategoria: csoportStatisztika(tetelek, "kategoria", ma),
        felelos: csoportStatisztika(tetelek, "felelos", ma),
        kiado: csoportStatisztika(tetelek, "kiado", ma),
      },
      sorok: [...sorok.values()]
        .map(({ _napok, _kiadok, ...s }) => ({
          ...s,
          atlagNap: atlag(_napok),
          kiadok: [..._kiadok.entries()]
            .map(([nev, v]) => ({ nev, ...v }))
            .sort((x, y) => y.db - x.db),
          nyitottak: s.nyitottak.sort(
            (x, y) =>
              Number(y.elakadt) - Number(x.elakadt) ||
              x.hatarido.localeCompare(y.hatarido),
          ),
        }))
        .sort(
          (x, y) =>
            y.elakadt - x.elakadt ||
            y.lejart - x.lejart ||
            x.nev.localeCompare(y.nev, "hu"),
        ),
      kiadok: [...kiadok.values()]
        .map(({ _egysegek, ...k }) => ({ ...k, feladat: _egysegek.size }))
        .sort((x, y) => y.kiadott - x.kiadott),
    };
  },

  /** The felelős accepts or refuses a task waiting on them; a refusal needs a reason. */
  async dontFeladatrol(
    viewer: FeladatViewer,
    id: string,
    input: { elfogad: boolean; indok?: string },
  ): Promise<Result> {
    await connectDB();
    const f = await findFeladat(id);
    if (!f || !(isFelelos(f, viewer) || isKiado(f, viewer)))
      return { ok: false, message: NINCS };
    if (!muveletek(f, viewer).dont) {
      return {
        ok: false,
        message: isFelelos(f, viewer)
          ? "Erről a feladatról már döntöttél"
          : "Csak az dönthet róla, akinek kiadtad",
      };
    }
    const indok = cleanSzoveg(input.indok);
    if (!input.elfogad && !indok)
      return { ok: false, message: "Írd meg, miért utasítod el — ezt látja, aki kiadta" };
    appendStatusChange(
      f,
      input.elfogad ? "elfogadva" : "elutasitva",
      viewer.userId,
      indok,
    );
    await f.save();
    if (!input.elfogad)
      await kapcsoltEsemeny(f, "elutasitva", viewer.userId, { megjegyzes: indok });
    return { ok: true, feladat: celOf(f) };
  },

  /** The felelős marks an accepted task done, optionally with a closing note. */
  async lezarFeladatot(
    viewer: FeladatViewer,
    id: string,
    megjegyzes?: string,
  ): Promise<Result> {
    await connectDB();
    const f = await findFeladat(id);
    if (!f || !(isFelelos(f, viewer) || isKiado(f, viewer)))
      return { ok: false, message: NINCS };
    if (!muveletek(f, viewer).lezar) {
      if (!isFelelos(f, viewer))
        return { ok: false, message: "Csak az zárhatja le, akinek kiadtad" };
      return {
        ok: false,
        message: allapotOf(f) === "kiadva" ? "Előbb fogadd el a feladatot" : LEZART,
      };
    }
    appendStatusChange(f, "lezarva", viewer.userId, cleanSzoveg(megjegyzes));
    await f.save();
    await kapcsoltEsemeny(f, "lezarva", viewer.userId, {
      megjegyzes: cleanSzoveg(megjegyzes),
    });
    return { ok: true, feladat: celOf(f) };
  },

  /** The kiadó takes back a task that is not done yet. */
  async visszavonFeladatot(
    viewer: FeladatViewer,
    id: string,
    indok?: string,
  ): Promise<Result> {
    await connectDB();
    const f = await findFeladat(id);
    if (!f || !(isFelelos(f, viewer) || isKiado(f, viewer)))
      return { ok: false, message: NINCS };
    if (!isKiado(f, viewer))
      return { ok: false, message: "Csak az vonhatja vissza, aki kiadta" };
    if (!isNyitott(f)) return { ok: false, message: LEZART };
    appendStatusChange(f, "visszavonva", viewer.userId, cleanSzoveg(indok));
    await f.save();
    await kapcsoltEsemeny(f, "visszavonva", viewer.userId, {
      megjegyzes: cleanSzoveg(indok),
    });
    return { ok: true, feladat: celOf(f) };
  },

  /**
   * After a refusal the kiadó gives the task to someone else (or the same person again) with a
   * new deadline; it starts over waiting for acceptance, the history and comments stay.
   */
  async ujrakiadFeladatot(
    viewer: FeladatViewer,
    id: string,
    input: { felelosId: string; hatarido: string },
  ): Promise<Result> {
    await connectDB();
    const f = await findFeladat(id);
    if (!f || !(isFelelos(f, viewer) || isKiado(f, viewer)))
      return { ok: false, message: NINCS };
    if (!muveletek(f, viewer).ujrakiad) {
      return {
        ok: false,
        message: isKiado(f, viewer)
          ? "Csak elutasított feladatot lehet újra kiadni"
          : "Csak az adhatja ki újra, aki kiadta",
      };
    }
    if (input.felelosId === viewer.userId)
      return { ok: false, message: "Magadnak nem adhatsz ki feladatot" };
    const felelos = await activeUser(input.felelosId);
    if (!felelos) return { ok: false, message: "Válaszd ki, kinek adod a feladatot" };
    const hiba = hataridoHiba(input.hatarido);
    if (hiba) return { ok: false, message: hiba };
    const nev = userNev(felelos);
    f.assignee = {
      userId: felelos._id,
      assignedAt: new Date(),
      assignedBy: new Types.ObjectId(viewer.userId),
    };
    f.felelosNev = nev;
    f.hatarido = parseHatarido(input.hatarido)!;
    appendStatusChange(f, "kiadva", viewer.userId, `Újra kiadva: ${nev}`);
    await f.save();
    await kapcsoltEsemeny(f, "ujrakiadva", viewer.userId, {
      ujFeladatId: String(f._id),
      ujFelelosId: String(felelos._id),
    });
    return { ok: true, feladat: celOf(f) };
  },

  /** Kiadó and felelős talk on the task while it is open. */
  async addFeladatMegjegyzes(
    viewer: FeladatViewer,
    id: string,
    szoveg: string,
    /** Protected media ids, already checked by the caller. */
    mediaIds: string[] = [],
  ): Promise<Result & { mediaIds?: string[] }> {
    await connectDB();
    const f = await findFeladat(id);
    if (!f || !(isFelelos(f, viewer) || isKiado(f, viewer)))
      return { ok: false, message: NINCS };
    if (!isNyitott(f)) return { ok: false, message: LEZART };
    const s = szoveg.trim();
    if (!s || s.length > FELADAT_SZOVEG_MAX)
      return { ok: false, message: "Írj megjegyzést (legfeljebb 2000 karakter)" };
    f.notes.push({
      text: s,
      authorId: new Types.ObjectId(viewer.userId),
      createdAt: new Date(),
    });
    const ujMedia = mediaIds.filter((m) => Types.ObjectId.isValid(m));
    if (ujMedia.length) {
      f.megjegyzesMediaIds = [
        ...(f.megjegyzesMediaIds ?? []),
        {
          megjegyzes: f.notes.length - 1,
          mediaIds: ujMedia.map((m) => new Types.ObjectId(m)),
        },
      ];
    }
    await f.save();
    return { ok: true, feladat: celOf(f), mediaIds: feladatMediaIdk(f) };
  },

  /**
   * Továbbadás (#49): the felelős of a new or accepted task hands it back to the kiadó or on to
   * someone else, with a reason. Their copy ends as `tovabbadva`; a new copy — same kiadó,
   * deadline, priority, attachments, comments and log — waits for the new felelős to accept,
   * and can be handed on again. Both copies point at each other, so the chain can be walked.
   */
  async tovabbadFeladatot(
    viewer: FeladatViewer,
    id: string,
    input: { celId: string; indok: string },
  ): Promise<Result & { regi?: FeladatErtesitesCel; mediaIds?: string[] }> {
    await connectDB();
    const f = await findFeladat(id);
    if (!f || !(isFelelos(f, viewer) || isKiado(f, viewer)))
      return { ok: false, message: NINCS };
    if (!muveletek(f, viewer).tovabbad) {
      if (!isFelelos(f, viewer))
        return { ok: false, message: "Csak a felelős adhatja tovább" };
      return {
        ok: false,
        message: f.sajat ? "Saját feladatot nem lehet továbbadni" : LEZART,
      };
    }
    const indok = cleanSzoveg(input.indok);
    if (!indok) return { ok: false, message: "Írd meg, miért adod tovább" };
    if (input.celId === viewer.userId)
      return { ok: false, message: "Magadnak nem adhatod tovább" };
    const cel = await activeUser(input.celId);
    if (!cel) return { ok: false, message: "Válaszd ki, kinek adod tovább" };
    const uj = await tovabbadPeldany(f, viewer.userId, cel, indok);
    await kapcsoltEsemeny(f, "tovabbadva", viewer.userId, {
      ujFeladatId: String(uj._id),
      ujFelelosId: String(cel._id),
      megjegyzes: indok,
    });
    return {
      ok: true,
      feladat: celOf(uj),
      regi: celOf(f),
      mediaIds: feladatMediaIdk(uj),
    };
  },

  // ── Csoportos feladat kezelése (8m, #61) — the kiadó manages a group as one ──────────────

  /**
   * Every copy of the task's group (or the task alone) for the task page's participants panel
   * and merged thread. Same visibility as `getFeladat`.
   */
  async listFeladatCsoport(viewer: FeladatViewer, id: string): Promise<FeladatSor[]> {
    await connectDB();
    const f = await findFeladat(id);
    if (!f || !(await mayView(f, viewer))) return [];
    if (!f.csoportId) return toSorok([f], viewer);
    const rows = await Feladat.find({ csoportId: f.csoportId })
      .sort({ createdAt: 1 })
      .exec();
    return toSorok(rows, viewer);
  },

  /**
   * Open tasks per list tab, a group task counted once: "Általam kiadott" and — with
   * `hr:feladat:read` — "Mindenki feladatai".
   */
  async countFeladatNezetek(
    viewer: FeladatViewer,
  ): Promise<{ kiadott: number; mind?: number }> {
    await connectDB();
    if (!Types.ObjectId.isValid(viewer.userId)) return { kiadott: 0 };
    const egysegDb = async (match: Record<string, unknown>) => {
      const [r] = await Feladat.aggregate<{ db: number }>([
        { $match: { ...match, "status.key": { $in: FELADAT_NYITOTT_ALLAPOTOK } } },
        { $group: { _id: { $ifNull: ["$csoportId", "$_id"] } } },
        { $count: "db" },
      ]).exec();
      return r?.db ?? 0;
    };
    const [kiadott, mind] = await Promise.all([
      egysegDb({ kiadoId: new Types.ObjectId(viewer.userId), sajat: { $ne: true } }),
      can(viewer, FELADAT_PERMISSIONS.read) ? egysegDb({}) : Promise.resolve(undefined),
    ]);
    return { kiadott, mind };
  },

  /**
   * The kiadó changes the deadline and / or priority — of every open copy of its group at once,
   * or (`csakEz`) of this copy alone. Each changed copy gets a log line; closed copies stay as
   * they were.
   */
  async modositFeladatot(
    viewer: FeladatViewer,
    id: string,
    input: {
      hatarido?: string;
      prioritas?: FeladatPrioritas;
      csakEz?: boolean;
      /** `''` clears it (#65). */
      kategoria?: string;
    },
  ): Promise<CsoportEredmeny> {
    await connectDB();
    const f = await findFeladat(id);
    const hiba = await kezeloHiba(f, viewer);
    if (hiba || !f) return { ok: false, message: hiba ?? NINCS, db: 0, celok: [] };
    if (!input.hatarido && !input.prioritas && input.kategoria === undefined)
      return { ok: false, message: "Nincs mit módosítani", db: 0, celok: [] };
    const ujKategoriaEredmeny =
      input.kategoria === undefined
        ? undefined
        : await kategoriaFeloldas(input.kategoria);
    if (ujKategoriaEredmeny && kategoriaHiba(ujKategoriaEredmeny))
      return { ok: false, message: ujKategoriaEredmeny.hiba, db: 0, celok: [] };
    const ujKategoria = ujKategoriaEredmeny;
    let ujHatarido: Date | undefined;
    if (input.hatarido) {
      const h = hataridoHiba(input.hatarido);
      if (h) return { ok: false, message: h, db: 0, celok: [] };
      ujHatarido = parseHatarido(input.hatarido)!;
    }
    const celok: FeladatErtesitesCel[] = [];
    for (const p of await nyitottPeldanyok(f, input.csakEz)) {
      const valtozas: string[] = [];
      if (ujHatarido && input.hatarido && p.hatarido.getTime() !== ujHatarido.getTime()) {
        valtozas.push(
          `határidő ${napSzoveg(p.hatarido.toISOString().slice(0, 10))} → ${napSzoveg(input.hatarido)}`,
        );
        p.hatarido = ujHatarido;
      }
      const regiPrioritas = p.prioritas ?? "normal";
      if (input.prioritas && regiPrioritas !== input.prioritas) {
        valtozas.push(
          `prioritás ${FELADAT_PRIORITAS_LABELS[regiPrioritas]} → ${FELADAT_PRIORITAS_LABELS[input.prioritas]}`,
        );
        p.prioritas = input.prioritas === "normal" ? undefined : input.prioritas;
      }
      if (ujKategoria && (p.kategoria ?? "") !== (ujKategoria.kategoria ?? "")) {
        valtozas.push(
          `kategória ${p.kategoria ?? "—"} → ${ujKategoria.kategoria ?? "—"}`,
        );
        p.kategoria = ujKategoria.kategoria;
        p.kategoriaKulcs = ujKategoria.kategoriaKulcs;
      }
      if (valtozas.length === 0) continue;
      naploSor(p, viewer.userId, `Módosítva: ${valtozas.join(", ")}`);
      await p.save();
      celok.push(celOf(p));
    }
    if (celok.length === 0)
      return { ok: false, message: "Nem változott semmi", db: 0, celok };
    return { ok: true, db: celok.length, celok };
  },

  /**
   * One comment to every open copy of a group at once (8m): each member reads it in their own
   * thread, marked "mindenkinek", and answers there (privately, to the kiadó). Its index is
   * recorded on every copy, so the task page merges the copies' threads without duplicates.
   */
  async addCsoportMegjegyzes(
    viewer: FeladatViewer,
    id: string,
    szoveg: string,
    /** Protected media ids, already checked by the caller. */
    mediaIds: string[] = [],
  ): Promise<
    CsoportEredmeny & { peldanyMedia: Array<{ id: string; mediaIds: string[] }> }
  > {
    await connectDB();
    const f = await findFeladat(id);
    const hiba = await kezeloHiba(f, viewer);
    if (hiba || !f)
      return { ok: false, message: hiba ?? NINCS, db: 0, celok: [], peldanyMedia: [] };
    const sz = szoveg.trim();
    if (!sz || sz.length > FELADAT_SZOVEG_MAX)
      return {
        ok: false,
        message: "Írj megjegyzést (legfeljebb 2000 karakter)",
        db: 0,
        celok: [],
        peldanyMedia: [],
      };
    const ujMedia = mediaIds
      .filter((m) => Types.ObjectId.isValid(m))
      .map((m) => new Types.ObjectId(m));
    const most = new Date();
    const szerzo = new Types.ObjectId(viewer.userId);
    const celok: FeladatErtesitesCel[] = [];
    const peldanyMedia: Array<{ id: string; mediaIds: string[] }> = [];
    for (const p of await nyitottPeldanyok(f)) {
      p.notes.push({ text: sz, authorId: szerzo, createdAt: most });
      const index = p.notes.length - 1;
      if (f.csoportId) p.csoportMegjegyzesek = [...(p.csoportMegjegyzesek ?? []), index];
      if (ujMedia.length)
        p.megjegyzesMediaIds = [
          ...(p.megjegyzesMediaIds ?? []),
          { megjegyzes: index, mediaIds: ujMedia },
        ];
      await p.save();
      celok.push(celOf(p));
      peldanyMedia.push({ id: String(p._id), mediaIds: idk(ujMedia) });
    }
    return { ok: true, db: celok.length, celok, peldanyMedia };
  },

  /**
   * Adds recipients to a group task — or turns a single task into one (its felelős becomes the
   * elsődleges felelős). Each new member gets their own copy with the same title, description,
   * deadline, priority and attachments, waiting for acceptance. People who already have a copy
   * that is open or done are skipped. Linked tasks (#50) stay single.
   */
  async addCsoporttagok(
    viewer: FeladatViewer,
    id: string,
    felelosIds: string[],
  ): Promise<{
    ok: boolean;
    message?: string;
    peldanyok: Array<{ id: string; felelosId: string }>;
    mediaIds: string[];
    kihagyott: number;
  }> {
    await connectDB();
    const ures = { peldanyok: [], mediaIds: [], kihagyott: 0 };
    const f = await findFeladat(id);
    const hiba = await kezeloHiba(f, viewer);
    if (hiba || !f) return { ok: false, message: hiba ?? NINCS, ...ures };
    if (f.kapcsolat)
      return { ok: false, message: "Kapcsolt feladathoz nem adható címzett", ...ures };
    const ids = [...new Set(felelosIds)].filter((x) => Types.ObjectId.isValid(x));
    if (ids.length === 0)
      return { ok: false, message: "Válaszd ki, kit adsz hozzá", ...ures };
    const meglevok = f.csoportId
      ? await Feladat.find({ csoportId: f.csoportId }).exec()
      : [f];
    const BENT: FeladatAllapot[] = ["kiadva", "elfogadva", "elutasitva", "lezarva"];
    const bentVan = new Set(
      meglevok
        .filter((p) => BENT.includes(allapotOf(p)))
        .map((p) => String(p.assignee?.userId)),
    );
    const ujIds = ids.filter((x) => !bentVan.has(x));
    if (ujIds.length === 0)
      return { ok: false, message: "Mindegyikük már a csoportban van", ...ures };
    if (bentVan.size + ujIds.length > FELADAT_CSOPORT_MAX)
      return {
        ok: false,
        message: `Egy csoportos feladat legfeljebb ${FELADAT_CSOPORT_MAX} főnek szólhat`,
        ...ures,
      };
    const felelosok = await User.find({ _id: { $in: ujIds }, isActive: { $ne: false } })
      .select("name email")
      .lean()
      .exec();
    if (felelosok.length !== ujIds.length)
      return { ok: false, message: "Válaszd ki, kit adsz hozzá", ...ures };

    const most = new Date();
    const kiadoId = new Types.ObjectId(viewer.userId);
    if (!f.csoportId) {
      f.csoportId = new Types.ObjectId();
      f.elsodleges = true;
      naploSor(
        f,
        viewer.userId,
        `Csoportos feladat lett — ${f.felelosNev} az elsődleges felelős`,
      );
      await f.save();
    }
    const docs = felelosok.map((felelos) => {
      const sajat = String(felelos._id) === viewer.userId;
      const uj = new Feladat({
        cim: f.cim,
        leiras: f.leiras,
        hatarido: f.hatarido,
        kiadoId: f.kiadoId,
        kiadoNev: f.kiadoNev,
        felelosNev: userNev(felelos),
        sajat: sajat || undefined,
        csoportId: f.csoportId,
        prioritas: f.prioritas,
        mediaIds: f.mediaIds?.length ? f.mediaIds : undefined,
        kategoria: f.kategoria,
        kategoriaKulcs: f.kategoriaKulcs,
        assignee: { userId: felelos._id, assignedAt: most, assignedBy: kiadoId },
      });
      if (sajat) appendStatusChange(uj, "elfogadva", kiadoId, "Saját feladat");
      else appendStatusChange(uj, "kiadva", kiadoId, "Hozzáadva a csoportos feladathoz");
      return uj;
    });
    await Feladat.insertMany(docs);
    return {
      ok: true,
      peldanyok: docs.map((d) => ({
        id: String(d._id),
        felelosId: String(d.assignee!.userId),
      })),
      mediaIds: idk(f.mediaIds),
      kihagyott: ids.length - ujIds.length,
    };
  },

  /**
   * Withdraws every open copy of the group at once (one member: `visszavonFeladatot` on their
   * copy). Linked copies call their module back, as a single withdrawal does.
   */
  async visszavonCsoportot(
    viewer: FeladatViewer,
    id: string,
    indok?: string,
  ): Promise<CsoportEredmeny> {
    await connectDB();
    const f = await findFeladat(id);
    const hiba = await kezeloHiba(f, viewer);
    if (hiba || !f) return { ok: false, message: hiba ?? NINCS, db: 0, celok: [] };
    const ok = cleanSzoveg(indok);
    const celok: FeladatErtesitesCel[] = [];
    for (const p of await nyitottPeldanyok(f)) {
      appendStatusChange(p, "visszavonva", viewer.userId, ok);
      await p.save();
      await kapcsoltEsemeny(p, "visszavonva", viewer.userId, { megjegyzes: ok });
      celok.push(celOf(p));
    }
    return { ok: true, db: celok.length, celok };
  },

  /**
   * Makes this copy's felelős the group's elsődleges felelős (#48); everyone else becomes
   * közreműködő. Only a copy that still counts (not withdrawn or handed on); a log line on the
   * open copies concerned.
   */
  async setElsodlegesFelelos(viewer: FeladatViewer, id: string): Promise<Result> {
    await connectDB();
    const f = await findFeladat(id);
    const hiba = await kezeloHiba(f, viewer);
    if (hiba || !f) return { ok: false, message: hiba ?? NINCS };
    if (!f.csoportId) return { ok: false, message: "Ez nem csoportos feladat" };
    const a = allapotOf(f);
    if (a === "visszavonva" || a === "tovabbadva")
      return {
        ok: false,
        message: "Visszavont vagy továbbadott példány nem lehet elsődleges",
      };
    if (f.elsodleges) return { ok: true, feladat: celOf(f) };
    const korabbi = await Feladat.find({
      csoportId: f.csoportId,
      elsodleges: true,
    }).exec();
    for (const p of korabbi) {
      p.elsodleges = undefined;
      if (isNyitott(p))
        naploSor(
          p,
          viewer.userId,
          `Közreműködő lett — az elsődleges felelős: ${f.felelosNev}`,
        );
      await p.save();
    }
    f.elsodleges = true;
    if (isNyitott(f)) naploSor(f, viewer.userId, "Elsődleges felelős lett");
    await f.save();
    return { ok: true, feladat: celOf(f) };
  },

  /** Protected-media resolver (#47): who may open a task's attachments — same as its page. */
  async canViewFeladat(viewer: FeladatViewer, id: string): Promise<boolean> {
    await connectDB();
    const f = await findFeladat(id);
    return Boolean(f && (await mayView(f, viewer)));
  },

  /**
   * Protected-media resolver: who may upload an attachment. For a task about to be given
   * (`id` null) any active account — anyone may give a task; for an existing one whoever may
   * comment on it now (kiadó or felelős, while open).
   */
  async canUploadFeladatCsatolmany(
    viewer: FeladatViewer,
    id: string | null,
  ): Promise<boolean> {
    await connectDB();
    if (id === null) return Boolean(await activeUser(viewer.userId));
    const f = await findFeladat(id);
    return Boolean(f && muveletek(f, viewer).megjegyzes);
  },

  // ── Lépések (#50) ────────────────────────────────────────────────────────────────────────

  /**
   * Replaces the task's steps — the felelős adds, renames, reorders, ticks and removes them in
   * one go while the task is open. Names are trimmed; empty ones dropped.
   */
  async setFeladatLepesek(
    viewer: FeladatViewer,
    id: string,
    lepesek: Array<{ nev: string; kesz?: boolean; hatarido?: string }>,
  ): Promise<Result> {
    await connectDB();
    const f = await findFeladat(id);
    if (!f || !(isFelelos(f, viewer) || isKiado(f, viewer)))
      return { ok: false, message: NINCS };
    if (!muveletek(f, viewer).lepesek) {
      return {
        ok: false,
        message: isFelelos(f, viewer) ? LEZART : "A lépéseket a felelős kezeli",
      };
    }
    const tiszta = lepesek
      .map((l) => ({ ...l, nev: l.nev.trim().slice(0, FELADAT_LEPES_NEV_MAX) }))
      .filter((l) => l.nev);
    if (tiszta.length > FELADAT_LEPES_MAX)
      return { ok: false, message: `Legfeljebb ${FELADAT_LEPES_MAX} lépés adható meg` };
    const out: Array<{ nev: string; kesz: boolean; hatarido?: Date }> = [];
    for (const l of tiszta) {
      let hatarido: Date | undefined;
      if (l.hatarido) {
        const d = parseHatarido(l.hatarido);
        if (!d) return { ok: false, message: `Érvénytelen határidő: ${l.nev}` };
        hatarido = d;
      }
      out.push({ nev: l.nev, kesz: Boolean(l.kesz), hatarido });
    }
    f.lepesek = out;
    await f.save();
    return { ok: true, feladat: celOf(f) };
  },

  /** Ticks (or unticks) one step. */
  async jelolFeladatLepes(
    viewer: FeladatViewer,
    id: string,
    index: number,
    kesz: boolean,
  ): Promise<Result> {
    await connectDB();
    const f = await findFeladat(id);
    if (!f || !(isFelelos(f, viewer) || isKiado(f, viewer)))
      return { ok: false, message: NINCS };
    if (!muveletek(f, viewer).lepesek)
      return { ok: false, message: "A lépéseket a felelős kezeli" };
    const lepesek = [...(f.lepesek ?? [])];
    const l = lepesek[index];
    if (!l) return { ok: false, message: "Nincs ilyen lépés" };
    lepesek[index] = { nev: l.nev, kesz, hatarido: l.hatarido };
    f.lepesek = lepesek;
    await f.save();
    return { ok: true, feladat: celOf(f) };
  },

  /** The viewer's own step templates, by name. */
  async listLepesSablonok(
    viewer: FeladatViewer,
  ): Promise<Array<{ id: string; nev: string; lepesek: string[] }>> {
    await connectDB();
    if (!Types.ObjectId.isValid(viewer.userId)) return [];
    const rows = await LepesSablon.find({ userId: viewer.userId })
      .sort({ nev: 1 })
      .lean()
      .exec();
    return rows.map((r) => ({ id: String(r._id), nev: r.nev, lepesek: r.lepesek }));
  },

  /** Saves (or overwrites, by name) a personal step template. */
  async saveLepesSablon(
    viewer: FeladatViewer,
    input: { nev: string; lepesek: string[] },
  ): Promise<{ ok: boolean; id?: string; message?: string }> {
    await connectDB();
    if (!(await activeUser(viewer.userId)))
      return { ok: false, message: "A fiókod nem található" };
    const nev = input.nev.trim().slice(0, 100);
    const lepesek = input.lepesek
      .map((l) => l.trim().slice(0, FELADAT_LEPES_NEV_MAX))
      .filter(Boolean)
      .slice(0, FELADAT_LEPES_MAX);
    if (!nev) return { ok: false, message: "Add meg a sablon nevét" };
    if (lepesek.length === 0) return { ok: false, message: "Legalább egy lépés kell" };
    const meglevo = await LepesSablon.findOne({ userId: viewer.userId, nev }).exec();
    if (
      !meglevo &&
      (await LepesSablon.countDocuments({ userId: viewer.userId })) >= LEPES_SABLON_MAX
    )
      return { ok: false, message: `Legfeljebb ${LEPES_SABLON_MAX} sablonod lehet` };
    const doc = await LepesSablon.findOneAndUpdate(
      { userId: viewer.userId, nev },
      { $set: { lepesek } },
      { upsert: true, new: true },
    ).exec();
    return { ok: true, id: String(doc._id) };
  },

  async deleteLepesSablon(viewer: FeladatViewer, id: string): Promise<Result> {
    await connectDB();
    if (!Types.ObjectId.isValid(id))
      return { ok: false, message: "A sablon nem található" };
    const r = await LepesSablon.deleteOne({ _id: id, userId: viewer.userId }).exec();
    return r.deletedCount
      ? { ok: true }
      : { ok: false, message: "A sablon nem található" };
  },

  /** Appends a template's steps to the task (only the viewer's own templates). */
  async alkalmazLepesSablon(
    viewer: FeladatViewer,
    id: string,
    sablonId: string,
  ): Promise<Result> {
    await connectDB();
    if (!Types.ObjectId.isValid(sablonId))
      return { ok: false, message: "A sablon nem található" };
    const sablon = await LepesSablon.findOne({ _id: sablonId, userId: viewer.userId })
      .lean()
      .exec();
    if (!sablon) return { ok: false, message: "A sablon nem található" };
    const f = await findFeladat(id);
    if (!f) return { ok: false, message: NINCS };
    const meglevo = (f.lepesek ?? []).map((l) => ({
      nev: l.nev,
      kesz: l.kesz,
      hatarido: l.hatarido?.toISOString().slice(0, 10),
    }));
    return feladatApi.setFeladatLepesek(viewer, id, [
      ...meglevo,
      ...sablon.lepesek.map((nev) => ({ nev, kesz: false })),
    ]);
  },

  // ── Kapcsolt feladatok (#50) — called by other modules through apps/erp ──────────────────

  /**
   * Gives a task tied to an entity step. `kiadoId` is the user whose action triggered it (e.g.
   * the one who moved the entity to its next stage); the same user as felelős makes an own
   * task (no acceptance). Optional `lepesek` pre-fill the steps.
   */
  async createKapcsoltFeladat(input: {
    kiadoId: string;
    felelosId: string;
    cim: string;
    leiras?: string;
    hatarido: string;
    prioritas?: FeladatPrioritas;
    kapcsolat: FeladatKapcsolat;
    lepesek?: string[];
    /** Default: the owning entity's category (`KAPCSOLAT_KATEGORIAK`), #65. */
    kategoria?: string;
  }): Promise<{ id: string; message?: string }> {
    await connectDB();
    const k = input.kapcsolat;
    if (!k.modul || !k.tipus || !k.id || !k.url)
      return { id: "", message: "Hiányos kapcsolat" };
    const r = await feladatApi.createFeladat(
      { userId: input.kiadoId, permissions: [] },
      {
        felelosIds: [input.felelosId],
        cim: input.cim,
        leiras: input.leiras,
        hatarido: input.hatarido,
        prioritas: input.prioritas,
        kategoria: input.kategoria ?? kapcsolatKategoria(k),
        kategoriaRendszer: true,
      },
    );
    if (!r.id) return { id: "", message: r.message };
    const lepesek = (input.lepesek ?? [])
      .map((nev) => nev.trim().slice(0, FELADAT_LEPES_NEV_MAX))
      .filter(Boolean)
      .slice(0, FELADAT_LEPES_MAX)
      .map((nev) => ({ nev, kesz: false }));
    await Feladat.updateOne(
      { _id: r.id },
      {
        $set: {
          kapcsolat: {
            modul: k.modul,
            tipus: k.tipus,
            id: k.id,
            szakasz: k.szakasz,
            url: k.url,
            ...(k.cimke ? { cimke: k.cimke.slice(0, FELADAT_CIM_MAX) } : {}),
          },
          ...(lepesek.length ? { lepesek } : {}),
        },
      },
    ).exec();
    return { id: r.id };
  },

  /** The tasks linked to an entity (optionally one szakasz), newest first. */
  async listKapcsoltFeladatok(kapcsolat: {
    modul: string;
    tipus: string;
    id: string;
    szakasz?: string;
  }): Promise<
    Array<{
      id: string;
      cim: string;
      allapot: FeladatAllapot;
      felelosId?: string;
      felelosNev: string;
      szakasz?: string;
      hatarido: string;
      /** The latest comment (status message) on the task, for the owning entity's timeline. */
      utolsoMegjegyzes?: { szoveg: string; mikor: string; szerzoNev?: string };
      megjegyzesDb: number;
      /** The felelős's current step, when they defined steps. */
      aktualisLepes?: { nev: string; sorszam: number; osszes: number };
    }>
  > {
    await connectDB();
    const rows = await Feladat.find(kapcsoltSzuro(kapcsolat))
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const nevById = await nevek(
      rows.flatMap((f) => {
        const n = f.notes?.[f.notes.length - 1];
        return n ? [n.authorId] : [];
      }),
    );
    return rows.map((f) => {
      const n = f.notes?.[f.notes.length - 1];
      return {
        id: String(f._id),
        cim: f.cim,
        allapot: f.status.key as FeladatAllapot,
        felelosId: f.assignee?.userId ? String(f.assignee.userId) : undefined,
        felelosNev: f.felelosNev,
        szakasz: f.kapcsolat?.szakasz,
        hatarido: f.hatarido.toISOString().slice(0, 10),
        utolsoMegjegyzes: n
          ? {
              szoveg: n.text,
              mikor: n.createdAt.toISOString(),
              szerzoNev: nevById.get(String(n.authorId)),
            }
          : undefined,
        megjegyzesDb: f.notes?.length ?? 0,
        aktualisLepes: aktualisLepes(f),
      };
    });
  },

  /**
   * The owning module closes the open tasks of an entity (step) — e.g. the step was finished
   * elsewhere or the entity was dropped. No hook fires: the module itself asked for it.
   */
  async lezarKapcsoltFeladatok(
    kapcsolat: { modul: string; tipus: string; id: string; szakasz?: string },
    actorId: string,
    megjegyzes?: string,
  ): Promise<{ db: number }> {
    await connectDB();
    const rows = await Feladat.find({
      ...kapcsoltSzuro(kapcsolat),
      "status.key": { $in: FELADAT_NYITOTT_ALLAPOTOK },
    }).exec();
    for (const f of rows) {
      appendStatusChange(
        f,
        "lezarva",
        actorId,
        cleanSzoveg(megjegyzes) ?? "Lezárva a kapcsolt tételnél",
      );
      await f.save();
    }
    return { db: rows.length };
  },

  /**
   * The owning module (e.g. a manager reassigning a stage) hands the open linked task to
   * someone else: same handover as the felelős's own (#49) — the old copy ends `tovabbadva`,
   * the new felelős must accept. No hook fires.
   */
  async atadKapcsoltFeladatot(
    kapcsolat: { modul: string; tipus: string; id: string; szakasz?: string },
    input: { ujFelelosId: string; actorId: string; indok: string },
  ): Promise<{ ok: boolean; id?: string; regiId?: string; message?: string }> {
    await connectDB();
    const f = await Feladat.findOne({
      ...kapcsoltSzuro(kapcsolat),
      "status.key": { $in: ["kiadva", "elfogadva", "elutasitva"] },
    })
      .sort({ createdAt: -1 })
      .exec();
    if (!f) return { ok: false, message: "Nincs nyitott kapcsolt feladat" };
    const cel = await activeUser(input.ujFelelosId);
    if (!cel) return { ok: false, message: "Válaszd ki, kinek adod tovább" };
    if (f.assignee?.userId && String(f.assignee.userId) === String(cel._id))
      return { ok: false, message: "Már nála van a feladat" };
    const indok = cleanSzoveg(input.indok) ?? "Átosztva";
    const uj = await tovabbadPeldany(f, input.actorId, cel, indok);
    return { ok: true, id: String(uj._id), regiId: String(f._id) };
  },
};
