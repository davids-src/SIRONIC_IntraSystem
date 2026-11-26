/**
 * `feladatUzenetApi` — the task's shared chat and text corrections (#68).
 *
 * One conversation per task for everyone on it: the kiadó, every member of a group task, and
 * every felelős along a handover chain read and write the same thread (`szalKulcs`). Messages
 * live in `feladat_uzenetek`; the comments written before (#68) stay on `Feladat.notes` and are
 * shown read-only — an old private comment of a group copy only to the people who saw it before
 * (that copy's felelős, the kiadó, `hr:feladat:read`).
 *
 * The facade only says who to notify (`ErtesitesCel`); apps/erp sends push / Jelzés / e-mail.
 */
import { Types } from "mongoose";
import { appendStatusChange, connectDB, User } from "@erp/db-core";
import {
  FELADAT_CIM_MAX,
  FELADAT_NYITOTT_ALLAPOTOK,
  FELADAT_PERMISSIONS,
  FELADAT_SZOVEG_MAX,
  type FeladatAllapot,
  type FeladatViewer,
} from "./constants";
import { Feladat, type IFeladat } from "./models/Feladat";
import {
  FeladatOlvasas,
  FeladatUzenet,
  type IFeladatUzenet,
} from "./models/FeladatUzenet";
import { feladatApi } from "./api";
import {
  emlitettek,
  idezet,
  type FeladatSzal,
  type SzalResztvevo,
  type UzenetSor,
} from "./uzenet";

/** One person to notify, with the link to their own copy of the task. */
export type UzenetErtesitesCel = { userId: string; feladatId: string };

type Eredmeny = { ok: boolean; message?: string };

const NINCS = "A feladat nem található";
const SZAL_MAX = 1000;
const LANC_MAX = 50;

const nyitott = (f: Pick<IFeladat, "status">) =>
  FELADAT_NYITOTT_ALLAPOTOK.includes(f.status.key as FeladatAllapot);

/** A copy that still counts — not handed on, not withdrawn. */
const szamit = (f: Pick<IFeladat, "status">) =>
  f.status.key !== "tovabbadva" && f.status.key !== "visszavonva";

const felelosId = (f: Pick<IFeladat, "assignee">) =>
  f.assignee?.userId ? String(f.assignee.userId) : undefined;

async function findFeladat(id: string): Promise<IFeladat | null> {
  return Types.ObjectId.isValid(id) ? Feladat.findById(id).exec() : null;
}

/**
 * The thread of a task: every copy of its group, or the handover chain it is on (first copy
 * first). The key is stable for the life of the task — a new member or a handover keeps it.
 */
export async function feladatSzala(
  f: IFeladat,
): Promise<{ kulcs: string; feladatok: IFeladat[] }> {
  // A workflow (#67) or an entity's steps (szerződés phases, ajánlatkérés stages): one thread
  // for every step's task, so the people of step 1 and step 3 talk in the same place.
  if (f.kapcsolat) {
    const { modul, tipus, id } = f.kapcsolat;
    const feladatok = await Feladat.find({
      "kapcsolat.modul": modul,
      "kapcsolat.tipus": tipus,
      "kapcsolat.id": id,
    })
      .sort({ createdAt: 1 })
      .exec();
    return { kulcs: `k:${modul}:${tipus}:${id}`, feladatok };
  }
  if (f.csoportId) {
    const feladatok = await Feladat.find({ csoportId: f.csoportId })
      .sort({ createdAt: 1 })
      .exec();
    return { kulcs: `cs:${f.csoportId}`, feladatok };
  }
  let gyoker = f;
  for (let i = 0; i < LANC_MAX && gyoker.elozmenyId; i += 1) {
    const elozo = await Feladat.findById(gyoker.elozmenyId).exec();
    if (!elozo) break;
    gyoker = elozo;
  }
  const feladatok = [gyoker];
  let akt = gyoker;
  for (let i = 0; i < LANC_MAX && akt.kovetkezoId; i += 1) {
    const kov = await Feladat.findById(akt.kovetkezoId).exec();
    if (!kov) break;
    feladatok.push(kov);
    akt = kov;
  }
  return { kulcs: `f:${gyoker._id}`, feladatok };
}

/**
 * Who is on the thread: the kiadó first, then every felelős (group: elsődleges first). A person
 * whose every copy was handed on or withdrawn is `aktiv: false` — they still read the thread.
 */
async function resztvevokOf(feladatok: IFeladat[]): Promise<SzalResztvevo[]> {
  if (feladatok.length === 0) return [];
  const tagok = new Map<string, SzalResztvevo>();
  // Every kiadó of the thread (a workflow's steps may be given by different people).
  for (const f of feladatok) {
    const k = String(f.kiadoId);
    if (!tagok.has(k))
      tagok.set(k, { id: k, nev: f.kiadoNev, szerep: "kiado", aktiv: true });
  }
  for (const f of feladatok) {
    const id = felelosId(f);
    if (!id || tagok.get(id)?.szerep === "kiado") continue;
    const szerep: SzalResztvevo["szerep"] =
      f.csoportId && !f.elsodleges ? "kozremukodo" : "felelos";
    const meglevo = tagok.get(id);
    if (meglevo) {
      meglevo.aktiv ||= szamit(f);
      if (szerep === "felelos") meglevo.szerep = "felelos";
    } else tagok.set(id, { id, nev: f.felelosNev, szerep, aktiv: szamit(f) });
  }
  const ids = [...tagok.keys()].filter((id) => Types.ObjectId.isValid(id));
  const users = await User.find({ _id: { $in: ids } })
    .select("name email image")
    .lean()
    .exec();
  for (const u of users) {
    const t = tagok.get(String(u._id));
    if (!t) continue;
    if (u.image) t.kep = u.image;
    t.nev = u.name || u.email || t.nev;
  }
  const rend = { kiado: 0, felelos: 1, kozremukodo: 2 } as const;
  return [...tagok.values()].sort(
    (a, b) =>
      rend[a.szerep] - rend[b.szerep] ||
      Number(b.aktiv) - Number(a.aktiv) ||
      a.nev.localeCompare(b.nev, "hu"),
  );
}

/**
 * The viewer may write while something of the task is still open: a kiadó, or anyone who is
 * (or was, on a closed step) felelős — not someone whose every copy was handed on or withdrawn.
 */
function irhatE(
  viewer: FeladatViewer,
  feladatok: IFeladat[],
  resztvevok: SzalResztvevo[],
): boolean {
  if (!feladatok.some(nyitott)) return false;
  return resztvevok.some((r) => r.id === viewer.userId && r.aktiv);
}

/** Each person's own copy for links: the open one if any, else the latest; the kiadó → `alap`. */
function sajatPeldany(feladatok: IFeladat[], userId: string, alap: string): string {
  const sajat = feladatok.filter((f) => felelosId(f) === userId);
  const p = sajat.find(nyitott) ?? sajat.at(-1);
  return p ? String(p._id) : alap;
}

/**
 * Old comments of the thread (before #68), deduplicated across copies (a handed-on copy carries
 * the earlier ones, a group-wide comment is on every copy). A private comment of a group copy
 * only for that copy's felelős / earlier felelős, the kiadó and `hr:feladat:read`.
 */
async function regiUzenetek(
  viewer: FeladatViewer,
  feladatok: IFeladat[],
  csoportos: boolean,
): Promise<UzenetSor[]> {
  const mindent =
    viewer.permissions.includes(FELADAT_PERMISSIONS.read) ||
    feladatok.some((f) => String(f.kiadoId) === viewer.userId);
  const lattuk = new Set<string>();
  const nyers: Array<{ sor: UzenetSor; szerzoId: string }> = [];
  for (const f of feladatok) {
    const notes = f.notes ?? [];
    if (notes.length === 0) continue;
    const mindenkinek = new Set(f.csoportMegjegyzesek ?? []);
    const sajatPeldanya =
      felelosId(f) === viewer.userId ||
      (f.korabbiFelelosIds ?? []).some((id) => String(id) === viewer.userId);
    const media = new Map(
      (f.megjegyzesMediaIds ?? []).map((m) => [
        m.megjegyzes,
        (m.mediaIds ?? []).map(String),
      ]),
    );
    notes.forEach((n, i) => {
      const kozos = mindenkinek.has(i);
      if (csoportos && !kozos && !mindent && !sajatPeldanya) return;
      const kulcs = `${n.createdAt.getTime()}|${n.authorId}|${n.text}`;
      if (lattuk.has(kulcs)) return;
      lattuk.add(kulcs);
      nyers.push({
        szerzoId: String(n.authorId),
        sor: {
          id: `regi:${f._id}:${i}`,
          szerzoId: String(n.authorId),
          szerzoNev: "",
          szoveg: n.text,
          mikor: n.createdAt.toISOString(),
          torolt: false,
          mediaIds: media.get(i) ?? [],
          emlitettIds: [],
          sajat: String(n.authorId) === viewer.userId,
          regi: true,
          cimke:
            csoportos && !kozos
              ? `korábbi üzenet — csak ${f.felelosNev} és a kiadó látta`
              : csoportos
                ? "korábbi üzenet mindenkinek"
                : undefined,
        },
      });
    });
  }
  const ids = [...new Set(nyers.map((n) => n.szerzoId))].filter((id) =>
    Types.ObjectId.isValid(id),
  );
  const users = await User.find({ _id: { $in: ids } })
    .select("name email")
    .lean()
    .exec();
  const nev = new Map(users.map((u) => [String(u._id), u.name || u.email]));
  return nyers.map((n) => ({ ...n.sor, szerzoNev: nev.get(n.szerzoId) ?? "Ismeretlen" }));
}

function toSor(
  u: IFeladatUzenet,
  viewer: FeladatViewer,
  byId: Map<string, IFeladatUzenet>,
): UzenetSor {
  const torolt = Boolean(u.torolve);
  const v = u.valaszId ? byId.get(String(u.valaszId)) : undefined;
  return {
    id: String(u._id),
    szerzoId: String(u.szerzoId),
    szerzoNev: u.szerzoNev,
    szoveg: torolt ? "" : u.szoveg,
    mikor: u.createdAt.toISOString(),
    szerkesztve: u.szerkesztve && !torolt ? u.szerkesztve.toISOString() : undefined,
    torolt,
    mediaIds: torolt ? [] : (u.mediaIds ?? []).map(String),
    emlitettIds: torolt ? [] : (u.emlitettIds ?? []).map(String),
    valasz: v
      ? {
          id: String(v._id),
          szerzoNev: v.szerzoNev,
          szoveg: v.torolve ? "" : idezet(v.szoveg),
          torolt: Boolean(v.torolve),
        }
      : undefined,
    sajat: String(u.szerzoId) === viewer.userId,
  };
}

async function viewerNev(userId: string): Promise<string | null> {
  if (!Types.ObjectId.isValid(userId)) return null;
  const u = await User.findOne({ _id: userId, isActive: { $ne: false } })
    .select("name email")
    .lean()
    .exec();
  return u ? u.name || u.email : null;
}

/** Loads the message and the thread it is on — only for someone who may see the task. */
async function uzenetSzallal(viewer: FeladatViewer, uzenetId: string) {
  if (!Types.ObjectId.isValid(uzenetId)) return null;
  const u = await FeladatUzenet.findById(uzenetId).exec();
  if (!u) return null;
  if (!(await feladatApi.canViewFeladat(viewer, String(u.feladatId)))) return null;
  const f = await findFeladat(String(u.feladatId));
  if (!f) return null;
  const szal = await feladatSzala(f);
  return { u, f, szal };
}

export const feladatUzenetApi = {
  /**
   * The task's conversation for its page: new messages + old comments in time order, the
   * participants, whether the viewer may write, and who has seen the last message. `olvasott`
   * records that the viewer opened it now (participants only).
   */
  async getFeladatSzal(
    viewer: FeladatViewer,
    feladatId: string,
    opts: { olvasott?: boolean } = {},
  ): Promise<FeladatSzal | null> {
    await connectDB();
    if (!(await feladatApi.canViewFeladat(viewer, feladatId))) return null;
    const f = await findFeladat(feladatId);
    if (!f) return null;
    const { kulcs, feladatok } = await feladatSzala(f);
    const [resztvevok, uzenetek, regiek] = await Promise.all([
      resztvevokOf(feladatok),
      FeladatUzenet.find({ szalKulcs: kulcs })
        .sort({ createdAt: 1 })
        .limit(SZAL_MAX)
        .exec(),
      // A group or a linked flow has independent copies — their old comments were private.
      regiUzenetek(viewer, feladatok, Boolean(f.csoportId || f.kapcsolat)),
    ]);
    const byId = new Map(uzenetek.map((u) => [String(u._id), u]));
    const sorok = [...regiek, ...uzenetek.map((u) => toSor(u, viewer, byId))].sort(
      (a, b) => a.mikor.localeCompare(b.mikor),
    );
    const resztvevo = resztvevok.some((r) => r.id === viewer.userId);
    const most = new Date();
    if (opts.olvasott && resztvevo) {
      await FeladatOlvasas.updateOne(
        { szalKulcs: kulcs, userId: new Types.ObjectId(viewer.userId) },
        { $set: { mikor: most } },
        { upsert: true },
      ).exec();
    }
    const utolso = sorok.filter((s) => !s.regi && !s.torolt).at(-1);
    let latta: FeladatSzal["latta"] = [];
    if (utolso) {
      const olvasasok = await FeladatOlvasas.find({
        szalKulcs: kulcs,
        mikor: { $gte: new Date(utolso.mikor) },
      })
        .lean()
        .exec();
      const lattak = new Set(olvasasok.map((o) => String(o.userId)));
      if (opts.olvasott && resztvevo) lattak.add(viewer.userId);
      latta = resztvevok
        .filter((r) => r.id !== utolso.szerzoId && lattak.has(r.id))
        .map((r) => ({ id: r.id, nev: r.nev, kep: r.kep }));
    }
    return {
      kulcs,
      uzenetek: sorok,
      resztvevok,
      irhat: irhatE(viewer, feladatok, resztvevok),
      latta,
    };
  },

  /**
   * A new message to everyone on the task. Mentions ("@Név" of a participant) are found in the
   * text; `valaszId` must be a message of the same thread. Returns who to notify — every active
   * participant except the author, the mentioned ones separately — each with their own copy,
   * and every copy of the thread for the attachments' usage.
   */
  async kuldUzenet(
    viewer: FeladatViewer,
    feladatId: string,
    input: { szoveg: string; valaszId?: string; mediaIds?: string[] },
  ): Promise<
    Eredmeny & {
      uzenetId?: string;
      cim?: string;
      szerzoNev?: string;
      cimzettek?: UzenetErtesitesCel[];
      emlitettek?: UzenetErtesitesCel[];
      feladatIds?: string[];
    }
  > {
    await connectDB();
    const f = await findFeladat(feladatId);
    if (!f || !(await feladatApi.canViewFeladat(viewer, feladatId)))
      return { ok: false, message: NINCS };
    const szoveg = input.szoveg.trim();
    if (!szoveg || szoveg.length > FELADAT_SZOVEG_MAX)
      return { ok: false, message: "Írj üzenetet (legfeljebb 2000 karakter)" };
    const { kulcs, feladatok } = await feladatSzala(f);
    const resztvevok = await resztvevokOf(feladatok);
    if (!irhatE(viewer, feladatok, resztvevok))
      return {
        ok: false,
        message: feladatok.some(nyitott)
          ? "Ehhez a feladathoz nem írhatsz"
          : "A feladat le van zárva — már nem lehet írni",
      };
    let valaszId: Types.ObjectId | undefined;
    if (input.valaszId) {
      const v = Types.ObjectId.isValid(input.valaszId)
        ? await FeladatUzenet.findById(input.valaszId).select("szalKulcs").lean().exec()
        : null;
      if (!v || v.szalKulcs !== kulcs)
        return { ok: false, message: "A válaszolt üzenet nem található" };
      valaszId = v._id as Types.ObjectId;
    }
    const nev = await viewerNev(viewer.userId);
    if (!nev) return { ok: false, message: "A fiókod nem található" };
    const emlitett = emlitettek(szoveg, resztvevok).filter((id) => id !== viewer.userId);
    const u = await FeladatUzenet.create({
      szalKulcs: kulcs,
      feladatId: f._id,
      szerzoId: new Types.ObjectId(viewer.userId),
      szerzoNev: nev,
      szoveg,
      emlitettIds: emlitett.map((id) => new Types.ObjectId(id)),
      valaszId,
      mediaIds: (input.mediaIds ?? [])
        .filter((m) => Types.ObjectId.isValid(m))
        .map((m) => new Types.ObjectId(m)),
    });
    // The author has seen their own thread up to now.
    await FeladatOlvasas.updateOne(
      { szalKulcs: kulcs, userId: new Types.ObjectId(viewer.userId) },
      { $set: { mikor: new Date() } },
      { upsert: true },
    ).exec();
    const alap = String(f._id);
    const cel = (userId: string) => ({
      userId,
      feladatId: sajatPeldany(feladatok, userId, alap),
    });
    return {
      ok: true,
      uzenetId: String(u._id),
      cim: f.cim,
      szerzoNev: nev,
      cimzettek: resztvevok
        .filter((r) => r.aktiv && r.id !== viewer.userId && !emlitett.includes(r.id))
        .map((r) => cel(r.id)),
      emlitettek: emlitett.map(cel),
      feladatIds: feladatok.map((p) => String(p._id)),
    };
  },

  /**
   * The author corrects their message (typo, addition). Shown as "szerkesztve"; people newly
   * mentioned by the edit are returned to be notified.
   */
  async modositUzenet(
    viewer: FeladatViewer,
    uzenetId: string,
    szoveg: string,
  ): Promise<
    Eredmeny & { cim?: string; szerzoNev?: string; ujEmlitettek?: UzenetErtesitesCel[] }
  > {
    await connectDB();
    const t = await uzenetSzallal(viewer, uzenetId);
    if (!t) return { ok: false, message: "Az üzenet nem található" };
    const { u, f, szal } = t;
    if (String(u.szerzoId) !== viewer.userId)
      return { ok: false, message: "Csak a saját üzenetedet módosíthatod" };
    if (u.torolve) return { ok: false, message: "Törölt üzenetet nem lehet módosítani" };
    const s = szoveg.trim();
    if (!s || s.length > FELADAT_SZOVEG_MAX)
      return { ok: false, message: "Az üzenet 1–2000 karakter lehet" };
    if (s === u.szoveg) return { ok: true, ujEmlitettek: [] };
    const resztvevok = await resztvevokOf(szal.feladatok);
    const elotte = new Set((u.emlitettIds ?? []).map(String));
    const most = emlitettek(s, resztvevok).filter((id) => id !== viewer.userId);
    u.szoveg = s;
    u.emlitettIds = most.map((id) => new Types.ObjectId(id));
    u.szerkesztve = new Date();
    await u.save();
    return {
      ok: true,
      cim: f.cim,
      szerzoNev: u.szerzoNev,
      ujEmlitettek: most
        .filter((id) => !elotte.has(id))
        .map((userId) => ({
          userId,
          feladatId: sajatPeldany(szal.feladatok, userId, String(f._id)),
        })),
    };
  },

  /** The author deletes their message — it stays as "törölt üzenet" so replies still make sense. */
  async torolUzenet(viewer: FeladatViewer, uzenetId: string): Promise<Eredmeny> {
    await connectDB();
    const t = await uzenetSzallal(viewer, uzenetId);
    if (!t) return { ok: false, message: "Az üzenet nem található" };
    if (String(t.u.szerzoId) !== viewer.userId)
      return { ok: false, message: "Csak a saját üzenetedet törölheted" };
    if (t.u.torolve) return { ok: true };
    t.u.torolve = new Date();
    t.u.szoveg = "";
    t.u.mediaIds = [];
    t.u.emlitettIds = [];
    await t.u.save();
    return { ok: true };
  },

  /**
   * The kiadó corrects or completes the task's title / description — on every copy of a group
   * (closed ones too, so the record reads right). Each changed copy gets a log line; the
   * felelősök of the open copies are returned to be notified.
   */
  async modositFeladatSzoveget(
    viewer: FeladatViewer,
    feladatId: string,
    input: { cim?: string; leiras?: string },
  ): Promise<Eredmeny & { cim?: string; celok?: UzenetErtesitesCel[]; mi?: string[] }> {
    await connectDB();
    const f = await findFeladat(feladatId);
    if (!f || !(await feladatApi.canViewFeladat(viewer, feladatId)))
      return { ok: false, message: NINCS };
    if (String(f.kiadoId) !== viewer.userId)
      return { ok: false, message: "A feladat szövegét a kiadója módosíthatja" };
    const cim = input.cim?.trim();
    if (input.cim !== undefined && (!cim || cim.length > FELADAT_CIM_MAX))
      return {
        ok: false,
        message: "Add meg röviden a feladatot (legfeljebb 200 karakter)",
      };
    const leiras =
      input.leiras === undefined
        ? undefined
        : input.leiras.trim().slice(0, FELADAT_SZOVEG_MAX);
    const peldanyok = f.csoportId
      ? await Feladat.find({ csoportId: f.csoportId }).exec()
      : (await feladatSzala(f)).feladatok;
    const mi = new Set<string>();
    const celok: UzenetErtesitesCel[] = [];
    for (const p of peldanyok) {
      const valtozas: string[] = [];
      if (cim !== undefined && cim !== p.cim) {
        valtozas.push(`cím: „${p.cim}” → „${cim}”`);
        mi.add("cím");
        p.cim = cim;
      }
      if (leiras !== undefined && leiras !== (p.leiras ?? "")) {
        valtozas.push("leírás módosítva");
        mi.add("leírás");
        p.leiras = leiras || undefined;
      }
      if (valtozas.length === 0) continue;
      appendStatusChange(
        p,
        p.status.key,
        viewer.userId,
        `Szöveg javítva: ${valtozas.join(", ")}`,
      );
      await p.save();
      const fid = felelosId(p);
      if (fid && fid !== viewer.userId && nyitott(p))
        celok.push({ userId: fid, feladatId: String(p._id) });
    }
    if (mi.size === 0) return { ok: false, message: "Nem változott semmi" };
    return { ok: true, cim: cim ?? f.cim, celok, mi: [...mi] };
  },

  /** Attachments of the thread's messages — a new copy (handover, new member) registers them too. */
  async szalMediaIdk(feladatId: string): Promise<string[]> {
    await connectDB();
    const f = await findFeladat(feladatId);
    if (!f) return [];
    const { kulcs } = await feladatSzala(f);
    const rows = await FeladatUzenet.find({
      szalKulcs: kulcs,
      torolve: { $exists: false },
    })
      .select("mediaIds")
      .lean()
      .exec();
    return [...new Set(rows.flatMap((r) => (r.mediaIds ?? []).map(String)))];
  },

  /**
   * Everyone to tell that the task changed (text, deadline, …): the active felelősök of the
   * thread except the actor — each with their own copy. Also used for "now you are the felelős".
   */
  async ertesitendok(feladatId: string, kiveve: string): Promise<UzenetErtesitesCel[]> {
    await connectDB();
    const f = await findFeladat(feladatId);
    if (!f) return [];
    const { feladatok } = await feladatSzala(f);
    const resztvevok = await resztvevokOf(feladatok);
    return resztvevok
      .filter((r) => r.aktiv && r.id !== kiveve)
      .map((r) => ({
        userId: r.id,
        feladatId: sajatPeldany(feladatok, r.id, String(f._id)),
      }));
  },
};
