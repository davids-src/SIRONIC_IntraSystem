import mongoose from "mongoose";
import { connectDB, Role, User } from "@erp/db-core";
import { decryptSecret, encryptSecret } from "@erp/lib/utils";
import { buildDataTableMongoQuery, type DataTableQuery } from "@erp/ui";
import {
  buildListFilter,
  canDelete,
  canReveal,
  canShare,
  canWrite,
  canRead,
  isOwner,
  type SecretAccessSubject,
} from "./access";
import { SECRET_LIST_COLUMNS, type SecretListItem } from "./columns";
import type { AccessAction, SecretViewer, ShareKind, ShareLevel } from "./constants";
import { Secret, SecretHozzaferes, SecretShare, type ISecret } from "./models/Secret";
import type { CreateSecretInput, ShareInput, UpdateSecretInput } from "./validation";

// `@erp/core` is not a dependency of this package: the global-search shapes are declared
// structurally (identical to `SearchHit` / `SearchViewer`), the app treats them alike.
const SEARCH_PER_TYPE = 5;
type SearchViewer = { userId: string; permissions: readonly string[] };
type SearchHit = {
  module: string;
  entityLabel: string;
  entityId: string;
  title: string;
  subtitle?: string;
  url: string;
};

export type { SecretViewer } from "./constants";

export type SecretResult = { ok: true; id?: string } | { ok: false; message: string };
export type RevealResult = { ok: true; value: string } | { ok: false; message: string };

/** Detail DTO: metadata and what the viewer may do — never the value or the ciphertext. */
export type SecretDetail = {
  _id: string;
  name: string;
  description?: string;
  partnerId?: string;
  ownerId: string;
  ownerName?: string;
  updatedAt: string;
  createdAt: string;
  muveletek: { reveal: boolean; write: boolean; delete: boolean; share: boolean };
};

export type SecretShareRow = {
  _id: string;
  kind: ShareKind;
  targetId: string;
  targetName?: string;
  level: ShareLevel;
  createdAt: string;
};

export type SecretAccessLogRow = {
  _id: string;
  userId: string;
  userName?: string;
  action: AccessAction;
  at: string;
};

const NOT_FOUND = "A titok nem található.";
const FORBIDDEN = "Ehhez nincs jogosultságod.";

const iso = (d: Date | undefined) => (d ? new Date(d).toISOString() : "");

async function sharedSecretIds(v: SecretViewer): Promise<mongoose.Types.ObjectId[]> {
  const ids = await SecretShare.distinct("secretId", {
    $or: [
      { kind: "user", targetId: v.userId },
      { kind: "role", targetId: { $in: [...v.roleIds] } },
    ],
  }).exec();
  return ids
    .filter((i) => mongoose.isValidObjectId(i))
    .map((i) => new mongoose.Types.ObjectId(String(i)));
}

async function loadSubject(
  id: string,
): Promise<{ doc: ISecret; subject: SecretAccessSubject } | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  const doc = await Secret.findById(id).exec();
  if (!doc) return null;
  const shares = await SecretShare.find({ secretId: String(doc._id) })
    .lean()
    .exec();
  return {
    doc,
    subject: {
      ownerId: doc.ownerId,
      shares: shares.map((s) => ({ kind: s.kind, targetId: s.targetId, level: s.level })),
    },
  };
}

function toDetail(
  doc: ISecret,
  v: SecretViewer,
  subject: SecretAccessSubject,
): SecretDetail {
  return {
    _id: String(doc._id),
    name: doc.name,
    description: doc.description,
    partnerId: doc.partnerId,
    ownerId: doc.ownerId,
    ownerName: doc.ownerName,
    updatedAt: iso(doc.updatedAt),
    createdAt: iso(doc.createdAt),
    muveletek: {
      reveal: canReveal(v, subject),
      write: canWrite(v, subject),
      delete: canDelete(v, subject),
      share: canShare(v, subject),
    },
  };
}

export const secretsApi = {
  /**
   * Global search: a few hits per entity type, gated on the viewer's read permissions (checked
   * before any query). Terms shorter than 2 characters return nothing.
   */
  async search(
    query: string,
    viewer: SearchViewer & { roleIds?: readonly string[] },
  ): Promise<SearchHit[]> {
    const term = query.trim();
    if (term.length < 2) return [];
    const sq = {
      page: 1,
      pageSize: SEARCH_PER_TYPE,
      search: term,
      filters: {},
    } as unknown as DataTableQuery;
    const out: SearchHit[] = [];
    if (viewer.permissions.includes("secrets:titok:read")) {
      // Names only — never values; the list applies the owner/share access filter.
      const { data } = await secretsApi.list(
        { ...viewer, roleIds: viewer.roleIds ?? [] },
        sq,
      );
      for (const s of data)
        out.push({
          module: "secrets",
          entityLabel: "Titok",
          entityId: s._id,
          title: s.name,
          subtitle: s.description,
          url: `/secrets/${s._id}`,
        });
    }
    return out;
  },
  /** The viewer's own and shared secrets. The projection drops the ciphertext in the query. */
  async list(
    viewer: SecretViewer,
    query: DataTableQuery,
  ): Promise<{ data: SecretListItem[]; total: number }> {
    await connectDB();
    const access = buildListFilter(viewer, await sharedSecretIds(viewer));
    const { filter, sort, skip, limit } = buildDataTableMongoQuery(
      query,
      SECRET_LIST_COLUMNS,
    );
    const full = { $and: [access, filter] };
    const [rows, total] = await Promise.all([
      Secret.find(full)
        .select("-valueEncrypted")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Secret.countDocuments(full).exec(),
    ]);
    return {
      data: rows.map((r) => ({
        _id: String(r._id),
        name: r.name,
        description: r.description,
        partnerId: r.partnerId,
        ownerId: r.ownerId,
        ownerName: r.ownerName,
        mine: r.ownerId === viewer.userId,
        updatedAt: iso(r.updatedAt),
      })),
      total,
    };
  },

  async get(viewer: SecretViewer, id: string): Promise<SecretDetail | null> {
    await connectDB();
    const loaded = await loadSubject(id);
    if (!loaded || !canRead(viewer, loaded.subject)) return null;
    return toDetail(loaded.doc, viewer, loaded.subject);
  },

  async create(
    viewer: SecretViewer & { userName?: string },
    input: CreateSecretInput,
  ): Promise<SecretResult> {
    if (!viewer.permissions.includes("secrets:titok:write"))
      return { ok: false, message: FORBIDDEN };
    await connectDB();
    let valueEncrypted: string;
    try {
      valueEncrypted = encryptSecret(input.value);
    } catch {
      return {
        ok: false,
        message:
          "A titkosítás nem lehetséges: a SECRETS_ENCRYPTION_KEY hiányzik vagy érvénytelen.",
      };
    }
    const doc = await Secret.create({
      name: input.name,
      description: input.description,
      partnerId: input.partnerId,
      valueEncrypted,
      ownerId: viewer.userId,
      ownerName: viewer.userName,
      updatedBy: viewer.userId,
    });
    return { ok: true, id: String(doc._id) };
  },

  async update(
    viewer: SecretViewer,
    id: string,
    input: UpdateSecretInput,
  ): Promise<SecretResult> {
    await connectDB();
    const loaded = await loadSubject(id);
    if (!loaded || !canRead(viewer, loaded.subject))
      return { ok: false, message: NOT_FOUND };
    if (!canWrite(viewer, loaded.subject)) return { ok: false, message: FORBIDDEN };
    const { doc } = loaded;
    if (input.value !== undefined) {
      try {
        doc.valueEncrypted = encryptSecret(input.value);
      } catch {
        return {
          ok: false,
          message:
            "A titkosítás nem lehetséges: a SECRETS_ENCRYPTION_KEY hiányzik vagy érvénytelen.",
        };
      }
    }
    doc.name = input.name;
    doc.description = input.description;
    doc.partnerId = input.partnerId;
    doc.updatedBy = viewer.userId;
    await doc.save();
    return { ok: true, id: String(doc._id) };
  },

  async delete(viewer: SecretViewer, id: string): Promise<SecretResult> {
    await connectDB();
    const loaded = await loadSubject(id);
    if (!loaded || !canRead(viewer, loaded.subject))
      return { ok: false, message: NOT_FOUND };
    if (!canDelete(viewer, loaded.subject)) return { ok: false, message: FORBIDDEN };
    await Secret.deleteOne({ _id: loaded.doc._id }).exec();
    await SecretShare.deleteMany({ secretId: id }).exec();
    return { ok: true };
  },

  /**
   * Decrypts one value for one permitted viewer and writes the audit entry first — if the entry
   * cannot be written, nothing is revealed. Never throws on a decryption problem.
   */
  async reveal(
    viewer: SecretViewer & { userName?: string },
    id: string,
  ): Promise<RevealResult> {
    await connectDB();
    const loaded = await loadSubject(id);
    if (!loaded || !canRead(viewer, loaded.subject))
      return { ok: false, message: NOT_FOUND };
    if (!canReveal(viewer, loaded.subject)) return { ok: false, message: FORBIDDEN };
    let value: string;
    try {
      value = decryptSecret(loaded.doc.valueEncrypted);
    } catch {
      return {
        ok: false,
        message:
          "Az érték nem fejthető vissza (hibás vagy hiányzó SECRETS_ENCRYPTION_KEY, vagy sérült adat).",
      };
    }
    try {
      await SecretHozzaferes.create({
        secretId: String(loaded.doc._id),
        secretName: loaded.doc.name,
        userId: viewer.userId,
        userName: viewer.userName,
        action: "reveal",
        at: new Date(),
      });
    } catch {
      return {
        ok: false,
        message: "A megjelenítés naplózása nem sikerült, az érték nem jeleníthető meg.",
      };
    }
    return { ok: true, value };
  },

  /** Owner's view of who it is shared with. */
  async listShares(viewer: SecretViewer, id: string): Promise<SecretShareRow[] | null> {
    await connectDB();
    const loaded = await loadSubject(id);
    if (!loaded || !canShare(viewer, loaded.subject)) return null;
    const rows = await SecretShare.find({ secretId: id })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return rows.map((r) => ({
      _id: String(r._id),
      kind: r.kind,
      targetId: r.targetId,
      targetName: r.targetName,
      level: r.level,
      createdAt: iso(r.createdAt),
    }));
  },

  /** Shares with a user or role, or changes the level of an existing share (idempotent). */
  async share(
    viewer: SecretViewer,
    id: string,
    input: ShareInput,
  ): Promise<SecretResult> {
    await connectDB();
    const loaded = await loadSubject(id);
    if (!loaded || !canRead(viewer, loaded.subject))
      return { ok: false, message: NOT_FOUND };
    if (!canShare(viewer, loaded.subject)) return { ok: false, message: FORBIDDEN };
    if (!mongoose.isValidObjectId(input.targetId)) {
      return { ok: false, message: "Érvénytelen címzett." };
    }
    if (input.kind === "user" && input.targetId === viewer.userId) {
      return { ok: false, message: "A saját titkot nem kell magaddal megosztani." };
    }
    let targetName: string | undefined;
    if (input.kind === "user") {
      const u = await User.findById(input.targetId)
        .select("name email isActive")
        .lean()
        .exec();
      if (!u || !u.isActive)
        return { ok: false, message: "A felhasználó nem található." };
      targetName = u.name || u.email;
    } else {
      const r = await Role.findById(input.targetId).select("name").lean().exec();
      if (!r) return { ok: false, message: "A szerepkör nem található." };
      targetName = r.name;
    }
    const share = await SecretShare.findOneAndUpdate(
      { secretId: id, kind: input.kind, targetId: input.targetId },
      { $set: { level: input.level, targetName, grantedBy: viewer.userId } },
      { upsert: true, returnDocument: "after" },
    ).exec();
    return { ok: true, id: String(share._id) };
  },

  async revokeShare(
    viewer: SecretViewer,
    id: string,
    shareId: string,
  ): Promise<SecretResult> {
    await connectDB();
    const loaded = await loadSubject(id);
    if (!loaded || !canRead(viewer, loaded.subject))
      return { ok: false, message: NOT_FOUND };
    if (!canShare(viewer, loaded.subject)) return { ok: false, message: FORBIDDEN };
    if (!mongoose.isValidObjectId(shareId))
      return { ok: false, message: "A megosztás nem található." };
    const res = await SecretShare.deleteOne({ _id: shareId, secretId: id }).exec();
    if (res.deletedCount === 0)
      return { ok: false, message: "A megosztás nem található." };
    return { ok: true };
  },

  /** Who revealed it and when — for the owner only. */
  async listAccessLog(
    viewer: SecretViewer,
    id: string,
    limit = 50,
  ): Promise<SecretAccessLogRow[] | null> {
    await connectDB();
    const loaded = await loadSubject(id);
    if (!loaded || !isOwner(viewer, loaded.subject) || !canRead(viewer, loaded.subject)) {
      return null;
    }
    const rows = await SecretHozzaferes.find({ secretId: id })
      .sort({ at: -1 })
      .limit(limit)
      .lean()
      .exec();
    return rows.map((r) => ({
      _id: String(r._id),
      userId: r.userId,
      userName: r.userName,
      action: r.action,
      at: iso(r.at),
    }));
  },

  /** Users and roles that can be picked in the share dialog (active users, all roles). */
  async listShareTargets(viewer: SecretViewer): Promise<{
    users: Array<{ id: string; label: string }>;
    roles: Array<{ id: string; label: string }>;
  }> {
    if (!viewer.permissions.includes("secrets:titok:share"))
      return { users: [], roles: [] };
    await connectDB();
    const [users, roles] = await Promise.all([
      User.find({ isActive: true }).select("name email").sort({ name: 1 }).lean().exec(),
      Role.find({}).select("name").sort({ name: 1 }).lean().exec(),
    ]);
    return {
      users: users
        .filter((u) => String(u._id) !== viewer.userId)
        .map((u) => ({ id: String(u._id), label: u.name || u.email })),
      roles: roles.map((r) => ({ id: String(r._id), label: r.name })),
    };
  },
};
