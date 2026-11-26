import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB, getNativeClient, Media } from "@erp/db-core";
import {
  filterCsatolhatoVedettMedia,
  getNyilvanosMediaById,
  getVedettMediaMeta,
  listMedia,
  syncMediaUsage,
  uploadFileToMedia,
} from "./service";
import {
  canViewVedettMedia,
  clearVedettMediaResolvers,
  registerVedettMediaResolver,
} from "./access";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
});

afterEach(async () => {
  clearVedettMediaResolvers();
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await getNativeClient().close();
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const anna = String(new mongoose.Types.ObjectId());
const bela = String(new mongoose.Types.ObjectId());
const bytes = Buffer.from("%PDF-1.4 titkos");

describe("protected media (#47)", () => {
  it("dedups only within the same access level and is hidden from the Médiatár", async () => {
    const nyilvanos = await uploadFileToMedia(bytes, { filename: "a.pdf" });
    const vedett = await uploadFileToMedia(bytes, {
      filename: "a.pdf",
      hozzaferes: "vedett",
      feltoltoId: anna,
    });
    expect(vedett.id).not.toBe(nyilvanos.id);
    expect(vedett.deduplicated).toBe(false);

    // Béla uploads the same bytes: same document, and he becomes an uploader too.
    const ujra = await uploadFileToMedia(bytes, {
      filename: "b.pdf",
      hozzaferes: "vedett",
      feltoltoId: bela,
    });
    expect(ujra).toEqual({ id: vedett.id, deduplicated: true });
    const doc = await Media.findById(vedett.id).lean().exec();
    expect(doc?.feltoltoIds?.map(String).sort()).toEqual([anna, bela].sort());

    const { items } = await listMedia({});
    expect(items.map((i) => i.id)).toEqual([nyilvanos.id]);
    expect(await getNyilvanosMediaById(vedett.id)).toBeNull();
    expect(await getNyilvanosMediaById(nyilvanos.id)).not.toBeNull();
    await expect(
      uploadFileToMedia(bytes, { filename: "x.pdf", hozzaferes: "vedett" }),
    ).rejects.toThrow();
  });

  it("only the uploader (or the entity already using it) may attach a protected file", async () => {
    const { id } = await uploadFileToMedia(bytes, {
      filename: "a.pdf",
      hozzaferes: "vedett",
      feltoltoId: anna,
    });
    const { id: nyilvanos } = await uploadFileToMedia(Buffer.from("nyilvanos"), {
      filename: "n.png",
    });
    expect(await filterCsatolhatoVedettMedia([id, nyilvanos], anna)).toEqual([id]);
    expect(await filterCsatolhatoVedettMedia([id], bela)).toEqual([]);

    const entityId = String(new mongoose.Types.ObjectId());
    await syncMediaUsage({
      entityType: "feladat",
      entityId,
      fieldName: "mediaIds",
      previousMediaIds: [],
      nextMediaIds: [id],
    });
    expect(
      await filterCsatolhatoVedettMedia([id], bela, { entityType: "feladat", entityId }),
    ).toEqual([id]);
    expect(await getVedettMediaMeta([id, nyilvanos])).toEqual([
      expect.objectContaining({ id, filename: "a.pdf", url: `/api/media/${id}/file` }),
    ]);
  });

  it("asks the resolver registered for a usage’s entity type; unknown types grant nothing", async () => {
    const entityId = String(new mongoose.Types.ObjectId());
    const media = { usages: [{ entityType: "feladat", entityId }] };
    const viewer = { userId: anna, permissions: [] };
    expect(await canViewVedettMedia(media, viewer)).toBe(false);

    registerVedettMediaResolver("feladat", {
      canView: async (v, id) => v.userId === anna && id === entityId,
      canUpload: async () => true,
    });
    expect(await canViewVedettMedia(media, viewer)).toBe(true);
    expect(await canViewVedettMedia(media, { userId: bela, permissions: [] })).toBe(
      false,
    );
    expect(await canViewVedettMedia({ usages: [] }, viewer)).toBe(false);

    registerVedettMediaResolver("hibas", {
      canView: async () => {
        throw new Error("x");
      },
      canUpload: async () => false,
    });
    expect(
      await canViewVedettMedia({ usages: [{ entityType: "hibas", entityId }] }, viewer),
    ).toBe(false);
  });
});
