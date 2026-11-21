import { createHash } from "node:crypto";
import mongoose, { type Types } from "mongoose";
import {
  connectDB,
  getUploadsBucket,
  Media,
  type IMedia,
  type MediaHozzaferes,
} from "@erp/db-core";
import {
  mediaPreviewPath,
  normalizeMediaUrl,
  filenameFromUrl,
  type MediaListItem,
} from "./paths";

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * The stored dedup key. A protected file's hash carries a `vedett:` prefix, so the one unique
 * `hash` index keeps working (no index migration) while a public and a protected copy of the
 * same bytes never collapse into one document — dedup stays within each access level.
 */
export function mediaHashKey(
  sha: string,
  hozzaferes: MediaHozzaferes = "nyilvanos",
): string {
  return hozzaferes === "vedett" ? `vedett:${sha}` : sha;
}

/** Public files only — a protected file is never found by its bare hash. */
export async function findFileMediaByHash(hash: string) {
  await connectDB();
  return Media.findOne({ type: "file", hash }).lean().exec();
}

export async function uploadFileToMedia(
  buffer: Buffer,
  opts: {
    filename: string;
    contentType?: string;
    /** Default `nyilvanos`. `vedett` needs `feltoltoId` (§7.5). */
    hozzaferes?: MediaHozzaferes;
    feltoltoId?: string;
  },
): Promise<{ id: string; deduplicated: boolean }> {
  await connectDB();
  const vedett = opts.hozzaferes === "vedett";
  if (vedett && !mongoose.Types.ObjectId.isValid(opts.feltoltoId ?? "")) {
    throw new Error("Protected upload needs the uploader");
  }
  const hash = mediaHashKey(sha256Hex(buffer), opts.hozzaferes);
  const existing = await Media.findOne({ type: "file", hash }).exec();
  if (existing) {
    if (vedett) {
      await Media.updateOne(
        { _id: existing._id },
        { $addToSet: { feltoltoIds: new mongoose.Types.ObjectId(opts.feltoltoId) } },
      ).exec();
    }
    return { id: String(existing._id), deduplicated: true };
  }

  const bucket = getUploadsBucket();
  const contentType = opts.contentType || "application/octet-stream";

  const uploadStream = bucket.openUploadStream(opts.filename, {
    metadata: { originalName: opts.filename, contentType },
  });

  await new Promise<void>((resolve, reject) => {
    uploadStream.on("error", reject);
    uploadStream.on("finish", () => resolve());
    uploadStream.end(buffer);
  });

  const doc = await Media.create({
    type: "file",
    hash,
    filename: opts.filename,
    contentType,
    size: buffer.length,
    gridFsId: uploadStream.id,
    useCount: 0,
    usages: [],
    ...(vedett
      ? {
          hozzaferes: "vedett",
          feltoltoIds: [new mongoose.Types.ObjectId(opts.feltoltoId)],
        }
      : {}),
  });

  return { id: String(doc._id), deduplicated: false };
}

export async function resolveOrCreateLinkMedia(url: string): Promise<string> {
  await connectDB();
  const normalized = normalizeMediaUrl(url);
  if (!normalized) {
    throw new Error("Empty media URL");
  }

  const existing = await Media.findOne({ type: "link", url: normalized }).exec();
  if (existing) {
    return String(existing._id);
  }

  const doc = await Media.create({
    type: "link",
    url: normalized,
    filename: filenameFromUrl(normalized),
    contentType: "image/*",
    useCount: 0,
    usages: [],
  });

  return String(doc._id);
}

export async function resolveLinkUrlsToMediaIds(urls: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const raw of urls) {
    const u = normalizeMediaUrl(raw);
    if (!u) continue;
    if (!/^https?:\/\//i.test(u)) continue;
    ids.push(await resolveOrCreateLinkMedia(u));
  }
  return ids;
}

function toObjectId(id: Types.ObjectId | string): mongoose.Types.ObjectId {
  return typeof id === "string"
    ? new mongoose.Types.ObjectId(id)
    : new mongoose.Types.ObjectId(id.toString());
}

export async function syncMediaUsage(opts: {
  entityType: string;
  entityId: Types.ObjectId | string;
  fieldName?: string;
  previousMediaIds: Array<Types.ObjectId | string>;
  nextMediaIds: Array<Types.ObjectId | string>;
}): Promise<void> {
  await connectDB();
  const fieldName = opts.fieldName ?? "imageIds";
  const entityId = toObjectId(opts.entityId);

  const prev = new Set(opts.previousMediaIds.map((id) => id.toString()));
  const next = new Set(opts.nextMediaIds.map((id) => id.toString()));

  const removed = [...prev].filter((id) => !next.has(id));
  const added = [...next].filter((id) => !prev.has(id));

  for (const mediaId of removed) {
    if (!mongoose.Types.ObjectId.isValid(mediaId)) continue;
    const oid = new mongoose.Types.ObjectId(mediaId);
    await Media.updateOne(
      { _id: oid },
      { $pull: { usages: { entityType: opts.entityType, entityId, fieldName } } },
    ).exec();
    const doc = await Media.findById(oid).select("usages").lean().exec();
    await Media.updateOne(
      { _id: oid },
      { $set: { useCount: doc?.usages?.length ?? 0 } },
    ).exec();
  }

  for (const mediaId of added) {
    if (!mongoose.Types.ObjectId.isValid(mediaId)) continue;
    const oid = new mongoose.Types.ObjectId(mediaId);
    await Media.updateOne(
      { _id: oid },
      { $addToSet: { usages: { entityType: opts.entityType, entityId, fieldName } } },
    ).exec();
    const doc = await Media.findById(oid).select("usages").lean().exec();
    await Media.updateOne(
      { _id: oid },
      { $set: { useCount: doc?.usages?.length ?? 0 } },
    ).exec();
  }
}

export async function setEntityMediaIds(opts: {
  entityType: string;
  entityId: Types.ObjectId | string;
  fieldName?: string;
  previousMediaIds: Array<Types.ObjectId | string>;
  nextMediaIds: Array<Types.ObjectId | string>;
}): Promise<void> {
  await syncMediaUsage(opts);
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listMedia(opts: {
  search?: string;
  type?: "file" | "link";
  unusedOnly?: boolean;
  limit?: number;
  skip?: number;
}): Promise<{ items: MediaListItem[]; total: number }> {
  await connectDB();
  const limit = Math.min(opts.limit ?? 48, 100);
  const skip = opts.skip ?? 0;

  // Protected files never show up in the Médiatár (§7.5).
  const filter: Record<string, unknown> = { hozzaferes: { $ne: "vedett" } };
  if (opts.type) filter.type = opts.type;
  if (opts.unusedOnly) filter.useCount = { $lte: 0 };

  const search = opts.search?.trim();
  if (search) {
    filter.$or = [
      { filename: new RegExp(escapeRegex(search), "i") },
      { url: new RegExp(escapeRegex(search), "i") },
    ];
  }

  const [docs, total] = await Promise.all([
    Media.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    Media.countDocuments(filter).exec(),
  ]);

  const items: MediaListItem[] = docs.map((doc) => ({
    id: String(doc._id),
    type: doc.type,
    filename: doc.filename,
    url: doc.url,
    contentType: doc.contentType,
    size: doc.size,
    useCount: doc.useCount ?? 0,
    usages: (doc.usages ?? []).map((u) => ({
      entityType: u.entityType,
      entityId: String(u.entityId),
      fieldName: u.fieldName,
    })),
    previewUrl: mediaPreviewPath(String(doc._id)),
    createdAt: new Date(doc.createdAt).toISOString(),
  }));

  return { items, total };
}

export async function getMediaById(id: string): Promise<IMedia | null> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Media.findById(id).exec();
}

export async function deleteMediaById(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) return { ok: false, message: "Invalid id" };

  const media = await Media.findById(id).exec();
  if (!media) return { ok: false, message: "Not found" };

  if (media.type === "file" && media.gridFsId) {
    const bucket = getUploadsBucket();
    try {
      await bucket.delete(media.gridFsId);
    } catch {
      /* file may already be gone */
    }
  }

  await Media.deleteOne({ _id: media._id }).exec();
  return { ok: true };
}

export async function linkUrlsFromMediaIds(
  mediaIds: Array<Types.ObjectId | string>,
): Promise<string[]> {
  if (mediaIds.length === 0) return [];
  await connectDB();
  const objectIds = mediaIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id.toString()))
    .map((id) => new mongoose.Types.ObjectId(id.toString()));
  const docs = await Media.find({ _id: { $in: objectIds }, type: "link" })
    .select("url")
    .lean()
    .exec();
  return docs.map((d) => d.url).filter((u): u is string => Boolean(u));
}

export async function filterFileMediaIds(
  mediaIds: Array<Types.ObjectId | string>,
): Promise<string[]> {
  if (mediaIds.length === 0) return [];
  await connectDB();
  const objectIds = mediaIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id.toString()))
    .map((id) => new mongoose.Types.ObjectId(id.toString()));
  const docs = await Media.find({ _id: { $in: objectIds }, type: "file" })
    .select("_id")
    .lean()
    .exec();
  return docs.map((d) => String(d._id));
}

/** Public media by id — the Médiatár's metadata / delete routes treat a protected file as missing. */
export async function getNyilvanosMediaById(id: string): Promise<IMedia | null> {
  const media = await getMediaById(id);
  return media && media.hozzaferes !== "vedett" ? media : null;
}

export type VedettMediaMeta = {
  id: string;
  filename: string;
  contentType?: string;
  size?: number;
  url: string;
};

/** Names and types of protected files, in the given order — for showing an entity's attachments. */
export async function getVedettMediaMeta(
  mediaIds: Array<Types.ObjectId | string>,
): Promise<VedettMediaMeta[]> {
  const ids = [...new Set(mediaIds.map(String))].filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );
  if (ids.length === 0) return [];
  await connectDB();
  const docs = await Media.find({ _id: { $in: ids }, hozzaferes: "vedett" })
    .select("filename contentType size")
    .lean()
    .exec();
  const byId = new Map(docs.map((d) => [String(d._id), d]));
  return ids.flatMap((id) => {
    const d = byId.get(id);
    return d
      ? [
          {
            id,
            filename: d.filename,
            contentType: d.contentType,
            size: d.size,
            url: mediaPreviewPath(id),
          },
        ]
      : [];
  });
}

/**
 * Which of `mediaIds` this user may put on the given entity: protected files they uploaded
 * themselves, or ones already attached to that very entity. Anything else — a public file, a
 * stranger's protected file whose id leaked — is dropped, so attaching can never be used to
 * gain access to a file one could not see.
 */
export async function filterCsatolhatoVedettMedia(
  mediaIds: Array<Types.ObjectId | string>,
  userId: string,
  entity?: { entityType: string; entityId: string },
): Promise<string[]> {
  const ids = [...new Set(mediaIds.map(String))].filter((id) =>
    mongoose.Types.ObjectId.isValid(id),
  );
  if (ids.length === 0 || !mongoose.Types.ObjectId.isValid(userId)) return [];
  await connectDB();
  const or: Record<string, unknown>[] = [
    { feltoltoIds: new mongoose.Types.ObjectId(userId) },
  ];
  if (entity && mongoose.Types.ObjectId.isValid(entity.entityId)) {
    or.push({
      usages: {
        $elemMatch: {
          entityType: entity.entityType,
          entityId: new mongoose.Types.ObjectId(entity.entityId),
        },
      },
    });
  }
  const docs = await Media.find({
    _id: { $in: ids },
    type: "file",
    hozzaferes: "vedett",
    $or: or,
  })
    .select("_id")
    .lean()
    .exec();
  const ok = new Set(docs.map((d) => String(d._id)));
  return ids.filter((id) => ok.has(id));
}
