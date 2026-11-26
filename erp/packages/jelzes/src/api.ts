import { Types } from "mongoose";
import { connectDB, Permission, Role, User } from "@erp/db-core";
import {
  EMAIL_BEALLITAS_ALAP,
  EMAIL_KATEGORIAK,
  JELZES_TIPUSOK,
  type EmailBeallitasok,
  type EmailKategoria,
  type JelzesTipus,
} from "./constants";
import { ErtesitesBeallitas } from "./models/ErtesitesBeallitas";
import { Jelzes, JelzesCimzett } from "./models/Jelzes";
import type { JelzesCimzettek } from "./validation";

export type UjJelzes = {
  cim: string;
  szoveg?: string;
  tipus?: JelzesTipus;
  url?: string;
  kuldoId?: string;
  kuldoNev?: string;
  cimzettLeiras?: string;
  push?: boolean;
};

/** One Jelzés as a recipient sees it. */
export type JelzesSor = {
  id: string;
  cim: string;
  szoveg?: string;
  tipus: JelzesTipus;
  url?: string;
  kuldoNev?: string;
  createdAt: string;
  olvasva: boolean;
};

export type JelzesListaSzuro = {
  tipus?: JelzesTipus;
  /** `true` only read, `false` only unread. */
  olvasott?: boolean;
  oldal?: number;
  oldalMeret?: number;
};

/** A sent körüzenet / frissítési jegyzet with its read ratio. */
export type KuldottJelzes = {
  id: string;
  cim: string;
  tipus: JelzesTipus;
  kuldoNev?: string;
  cimzettLeiras?: string;
  cimzettDb: number;
  olvasottDb: number;
  push: boolean;
  createdAt: string;
};

const oid = (id: string) => new Types.ObjectId(id);

/** Stored flags → plain booleans (drops anything that is not a known category). */
function pick(
  email: Partial<Record<string, unknown>> | undefined,
): Partial<EmailBeallitasok> {
  const out: Partial<EmailBeallitasok> = {};
  for (const k of EMAIL_KATEGORIAK)
    if (typeof email?.[k] === "boolean") out[k] = email[k] as boolean;
  return out;
}
const ervenyesIds = (ids: string[]) =>
  [...new Set(ids)].filter((id) => Types.ObjectId.isValid(id)).map(oid);

export const jelzesApi = {
  /**
   * Writes the Jelzés and one unread row per (distinct, valid) recipient. Returns the Jelzés id,
   * or `null` when there was nobody to send it to.
   */
  async letrehoz(userIds: string[], uj: UjJelzes): Promise<string | null> {
    const cimzettek = ervenyesIds(userIds);
    if (cimzettek.length === 0) return null;
    await connectDB();
    const tipus = uj.tipus ?? "rendszer";
    const jelzes = await Jelzes.create({
      cim: uj.cim.slice(0, 300),
      szoveg: uj.szoveg?.trim() || undefined,
      tipus,
      url: uj.url || undefined,
      kuldoId:
        uj.kuldoId && Types.ObjectId.isValid(uj.kuldoId) ? oid(uj.kuldoId) : undefined,
      kuldoNev: uj.kuldoNev,
      cimzettDb: cimzettek.length,
      cimzettLeiras: uj.cimzettLeiras,
      push: uj.push ?? false,
    });
    await JelzesCimzett.insertMany(
      cimzettek.map((userId) => ({
        jelzesId: jelzes._id,
        userId,
        tipus,
        olvasva: null,
        createdAt: jelzes.createdAt,
      })),
      { ordered: false },
    );
    return String(jelzes._id);
  },

  /**
   * One-off cleanup (2026-11-19): task events used to be stored as Jelzések too, but the
   * Feladatok page and its sidebar count are their home — Jelzések are for announcements and
   * non-task system events. Removes the old task rows (system type, url under /feladatok).
   */
  async feladatJelzesekTorlese(): Promise<number> {
    await connectDB();
    const regi = await Jelzes.find({ tipus: "rendszer", url: /^\/feladatok(\/|$|\?)/ })
      .select({ _id: 1 })
      .lean()
      .exec();
    if (regi.length === 0) return 0;
    const ids = regi.map((j) => j._id);
    await JelzesCimzett.deleteMany({ jelzesId: { $in: ids } }).exec();
    await Jelzes.deleteMany({ _id: { $in: ids } }).exec();
    return ids.length;
  },

  /** The bell's number — one indexed count. */
  async olvasatlanDb(userId: string): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) return 0;
    await connectDB();
    return JelzesCimzett.countDocuments({ userId: oid(userId), olvasva: null }).exec();
  },

  async lista(
    userId: string,
    szuro: JelzesListaSzuro = {},
  ): Promise<{ sorok: JelzesSor[]; osszes: number }> {
    if (!Types.ObjectId.isValid(userId)) return { sorok: [], osszes: 0 };
    await connectDB();
    const oldalMeret = Math.min(Math.max(szuro.oldalMeret ?? 25, 1), 100);
    const oldal = Math.max(szuro.oldal ?? 1, 1);
    const filter: Record<string, unknown> = { userId: oid(userId) };
    if (szuro.tipus && JELZES_TIPUSOK.includes(szuro.tipus)) filter.tipus = szuro.tipus;
    if (szuro.olvasott === true) filter.olvasva = { $ne: null };
    if (szuro.olvasott === false) filter.olvasva = null;
    const [sorok, osszes] = await Promise.all([
      JelzesCimzett.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((oldal - 1) * oldalMeret)
        .limit(oldalMeret)
        .lean()
        .exec(),
      JelzesCimzett.countDocuments(filter).exec(),
    ]);
    const jelzesek = await Jelzes.find({ _id: { $in: sorok.map((s) => s.jelzesId) } })
      .lean()
      .exec();
    const byId = new Map(jelzesek.map((j) => [String(j._id), j]));
    return {
      osszes,
      sorok: sorok.flatMap((s) => {
        const j = byId.get(String(s.jelzesId));
        if (!j) return [];
        return [
          {
            id: String(j._id),
            cim: j.cim,
            szoveg: j.szoveg,
            tipus: j.tipus,
            url: j.url,
            kuldoNev: j.kuldoNev,
            createdAt: j.createdAt.toISOString(),
            olvasva: s.olvasva != null,
          },
        ];
      }),
    };
  },

  /** Marks the given Jelzések (or all, with `'mind'`) read for this user only. */
  async olvasottnak(userId: string, jelzesIds: string[] | "mind"): Promise<number> {
    if (!Types.ObjectId.isValid(userId)) return 0;
    await connectDB();
    const filter: Record<string, unknown> = { userId: oid(userId), olvasva: null };
    if (jelzesIds !== "mind") {
      const ids = ervenyesIds(jelzesIds);
      if (ids.length === 0) return 0;
      filter.jelzesId = { $in: ids };
    }
    const r = await JelzesCimzett.updateMany(filter, {
      $set: { olvasva: new Date() },
    }).exec();
    return r.modifiedCount;
  },

  /**
   * Active users a körüzenet goes to: the picked users, every member of the picked roles, every
   * holder of the picked permission keys (through a role or directly), or — `mindenki` — all.
   */
  async cimzettekFeloldasa(c: JelzesCimzettek): Promise<string[]> {
    await connectDB();
    if (c.mindenki) {
      const all = await User.find({ isActive: true }).select({ _id: 1 }).lean().exec();
      return all.map((u) => String(u._id));
    }
    const or: Record<string, unknown>[] = [];
    const userIds = ervenyesIds(c.userIds);
    if (userIds.length) or.push({ _id: { $in: userIds } });
    const roleIds = ervenyesIds(c.roleIds);
    if (c.permissionKeys.length) {
      const perms = await Permission.find({ key: { $in: c.permissionKeys } })
        .select({ _id: 1 })
        .lean()
        .exec();
      if (perms.length) {
        const roles = await Role.find({ permissionIds: { $in: perms.map((p) => p._id) } })
          .select({ _id: 1 })
          .lean()
          .exec();
        roleIds.push(...roles.map((r) => r._id));
      }
      or.push({ directPermissionKeys: { $in: c.permissionKeys } });
    }
    if (roleIds.length) or.push({ roleIds: { $in: roleIds } });
    if (or.length === 0) return [];
    const users = await User.find({ isActive: true, $or: or })
      .select({ _id: 1 })
      .lean()
      .exec();
    return users.map((u) => String(u._id));
  },

  /** Körüzenetek and frissítési jegyzetek, newest first, with how many have read them. */
  async kuldottLista(
    oldal = 1,
    oldalMeret = 20,
  ): Promise<{ sorok: KuldottJelzes[]; osszes: number }> {
    await connectDB();
    const filter = { tipus: { $in: ["koruzenet", "frissites"] as JelzesTipus[] } };
    const [jelzesek, osszes] = await Promise.all([
      Jelzes.find(filter)
        .sort({ createdAt: -1 })
        .skip((Math.max(oldal, 1) - 1) * oldalMeret)
        .limit(oldalMeret)
        .lean()
        .exec(),
      Jelzes.countDocuments(filter).exec(),
    ]);
    const olvasott = await JelzesCimzett.aggregate<{ _id: Types.ObjectId; db: number }>([
      {
        $match: { jelzesId: { $in: jelzesek.map((j) => j._id) }, olvasva: { $ne: null } },
      },
      { $group: { _id: "$jelzesId", db: { $sum: 1 } } },
    ]).exec();
    const dbById = new Map(olvasott.map((o) => [String(o._id), o.db]));
    return {
      osszes,
      sorok: jelzesek.map((j) => ({
        id: String(j._id),
        cim: j.cim,
        tipus: j.tipus,
        kuldoNev: j.kuldoNev,
        cimzettLeiras: j.cimzettLeiras,
        cimzettDb: j.cimzettDb,
        olvasottDb: dbById.get(String(j._id)) ?? 0,
        push: j.push,
        createdAt: j.createdAt.toISOString(),
      })),
    };
  },

  /** What the sending form can pick from. */
  async cimzettOpciok(): Promise<{
    felhasznalok: { id: string; nev: string; email: string }[];
    szerepkorok: { id: string; nev: string }[];
    jogosultsagok: { key: string; nev: string; csoport: string }[];
  }> {
    await connectDB();
    const [users, roles, perms] = await Promise.all([
      User.find({ isActive: true })
        .select({ name: 1, email: 1 })
        .sort({ name: 1 })
        .lean()
        .exec(),
      Role.find().select({ name: 1 }).sort({ name: 1 }).lean().exec(),
      Permission.find()
        .select({ key: 1, label: 1, group: 1 })
        .sort({ group: 1, key: 1 })
        .lean()
        .exec(),
    ]);
    return {
      felhasznalok: users.map((u) => ({
        id: String(u._id),
        nev: u.name || u.email,
        email: u.email,
      })),
      szerepkorok: roles.map((r) => ({ id: String(r._id), nev: r.name })),
      jogosultsagok: perms.map((p) => ({
        key: p.key,
        nev: p.label || p.key,
        csoport: p.group,
      })),
    };
  },
  /** The user's e-mail preferences — every category off when nothing was saved (#71). */
  async emailBeallitasok(userId: string): Promise<EmailBeallitasok> {
    if (!Types.ObjectId.isValid(userId)) return { ...EMAIL_BEALLITAS_ALAP };
    await connectDB();
    const sor = await ErtesitesBeallitas.findOne({ userId: oid(userId) })
      .lean()
      .exec();
    return { ...EMAIL_BEALLITAS_ALAP, ...pick(sor?.email) };
  },

  /** Switches the given categories (only known keys, only booleans); returns the new state. */
  async mentEmailBeallitasok(
    userId: string,
    valtozas: Partial<EmailBeallitasok>,
  ): Promise<EmailBeallitasok> {
    if (!Types.ObjectId.isValid(userId)) return { ...EMAIL_BEALLITAS_ALAP };
    await connectDB();
    const set: Record<string, boolean> = {};
    for (const k of EMAIL_KATEGORIAK) {
      if (typeof valtozas[k] === "boolean") set[`email.${k}`] = valtozas[k] as boolean;
    }
    if (Object.keys(set).length > 0) {
      await ErtesitesBeallitas.updateOne(
        { userId: oid(userId) },
        { $set: set },
        { upsert: true },
      ).exec();
    }
    return jelzesApi.emailBeallitasok(userId);
  },

  /**
   * Who of `userIds` gets an e-mail of this category: opted in, active, with an e-mail address.
   * One query for the preferences, one for the users — whatever the number of recipients.
   */
  async emailCimzettek(
    userIds: string[],
    kategoria: EmailKategoria,
  ): Promise<Array<{ id: string; email: string; nev: string }>> {
    const ids = ervenyesIds(userIds);
    if (ids.length === 0) return [];
    await connectDB();
    const beallitasok = await ErtesitesBeallitas.find({
      userId: { $in: ids },
      [`email.${kategoria}`]: true,
    })
      .select({ userId: 1 })
      .lean()
      .exec();
    if (beallitasok.length === 0) return [];
    const users = await User.find({
      _id: { $in: beallitasok.map((b) => b.userId) },
      isActive: true,
    })
      .select({ email: 1, name: 1 })
      .lean()
      .exec();
    return users
      .filter((u) => typeof u.email === "string" && u.email.includes("@"))
      .map((u) => ({ id: String(u._id), email: u.email, nev: u.name }));
  },
};
