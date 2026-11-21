import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB, getNativeClient, Permission, Role, User } from "@erp/db-core";
import { jelzesApi } from "./api";
import { koruzenetSchema } from "./validation";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await getNativeClient().close();
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

async function fiok(
  name: string,
  opts: { roleIds?: string[]; direct?: string[]; isActive?: boolean } = {},
) {
  const u = await User.create({
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    name,
    roleIds: opts.roleIds ?? [],
    directPermissionKeys: opts.direct ?? [],
    isActive: opts.isActive ?? true,
  });
  return String(u._id);
}

describe("jelzések (8l)", () => {
  it("fans out to each recipient with its own read state", async () => {
    const anna = await fiok("Kiss Anna");
    const bela = await fiok("Nagy Bela");

    const id = await jelzesApi.letrehoz([anna, bela, anna, "nem-id"], {
      cim: "Új feladat: leltár",
      szoveg: "Határidő péntek",
      url: "/feladatok/1",
    });
    expect(id).toBeTruthy();
    await jelzesApi.letrehoz([anna], { cim: "Frissítés", tipus: "frissites" });

    expect(await jelzesApi.olvasatlanDb(anna)).toBe(2);
    expect(await jelzesApi.olvasatlanDb(bela)).toBe(1);

    const { sorok, osszes } = await jelzesApi.lista(anna);
    expect(osszes).toBe(2);
    expect(sorok[0]).toMatchObject({
      cim: "Frissítés",
      tipus: "frissites",
      olvasva: false,
    });
    expect(sorok[1]).toMatchObject({ cim: "Új feladat: leltár", url: "/feladatok/1" });

    // Anna reading it does not read it for Béla.
    expect(await jelzesApi.olvasottnak(anna, [id!])).toBe(1);
    expect(await jelzesApi.olvasatlanDb(anna)).toBe(1);
    expect(await jelzesApi.olvasatlanDb(bela)).toBe(1);

    expect(
      (await jelzesApi.lista(anna, { olvasott: false })).sorok.map((s) => s.cim),
    ).toEqual(["Frissítés"]);
    expect((await jelzesApi.lista(anna, { tipus: "rendszer" })).sorok).toHaveLength(1);

    expect(await jelzesApi.olvasottnak(anna, "mind")).toBe(1);
    expect(await jelzesApi.olvasatlanDb(anna)).toBe(0);
  });

  it("removes the old task jelzések, keeps every other one", async () => {
    const u = await fiok("Feladatos Feri");
    await jelzesApi.letrehoz([u], { cim: "Új feladat", url: "/feladatok/abc" });
    await jelzesApi.letrehoz([u], { cim: "Feladatlista", url: "/feladatok" });
    await jelzesApi.letrehoz([u], { cim: "Szabadság", url: "/hr/szabadsag/kerelmek" });
    await jelzesApi.letrehoz([u], {
      cim: "Hír",
      url: "/feladatok/x",
      tipus: "koruzenet",
    });

    expect(await jelzesApi.feladatJelzesekTorlese()).toBe(2);
    expect(await jelzesApi.olvasatlanDb(u)).toBe(2);
    const { sorok } = await jelzesApi.lista(u, {});
    expect(sorok.map((s) => s.cim).sort()).toEqual(["Hír", "Szabadság"]);
  });

  it("writes nothing when there is no valid recipient", async () => {
    expect(await jelzesApi.letrehoz([], { cim: "x" })).toBeNull();
    expect(await jelzesApi.letrehoz(["rossz"], { cim: "x" })).toBeNull();
  });

  it("resolves recipients from users, roles, permission holders and mindenki — active only", async () => {
    const perm = await Permission.create({ key: "hr:read", label: "HR", group: "hr" });
    const hrRole = await Role.create({
      key: "hr",
      name: "HR",
      permissionIds: [perm._id],
    });
    const ures = await Role.create({ key: "gepesz", name: "Gépész", permissionIds: [] });

    const szerepkorrel = await fiok("Role Tag", { roleIds: [String(hrRole._id)] });
    const kozvetlen = await fiok("Direct Tag", { direct: ["hr:read"] });
    const gepesz = await fiok("Gepesz", { roleIds: [String(ures._id)] });
    const sima = await fiok("Sima Ember");
    await fiok("Inaktiv", { roleIds: [String(hrRole._id)], isActive: false });

    const c = (x: Partial<Parameters<typeof jelzesApi.cimzettekFeloldasa>[0]>) =>
      jelzesApi.cimzettekFeloldasa({
        mindenki: false,
        userIds: [],
        roleIds: [],
        permissionKeys: [],
        ...x,
      });

    expect(await c({})).toEqual([]);
    expect((await c({ permissionKeys: ["hr:read"] })).sort()).toEqual(
      [szerepkorrel, kozvetlen].sort(),
    );
    expect(await c({ roleIds: [String(ures._id)] })).toEqual([gepesz]);
    expect(
      (await c({ roleIds: [String(ures._id)], userIds: [sima, gepesz] })).sort(),
    ).toEqual([gepesz, sima].sort());
    expect(await c({ mindenki: true })).toHaveLength(4);
  });

  it("lists sent körüzenetek with their read ratio, not system jelzések", async () => {
    const a = await fiok("A");
    const b = await fiok("B");
    const id = await jelzesApi.letrehoz([a, b], {
      cim: "Leállás pénteken",
      tipus: "koruzenet",
      kuldoNev: "Admin",
      cimzettLeiras: "Mindenki",
      push: true,
    });
    await jelzesApi.letrehoz([a], { cim: "Rendszer" });
    await jelzesApi.olvasottnak(a, [id!]);

    const { sorok, osszes } = await jelzesApi.kuldottLista();
    expect(osszes).toBe(1);
    expect(sorok[0]).toMatchObject({
      cim: "Leállás pénteken",
      cimzettDb: 2,
      olvasottDb: 1,
      push: true,
      cimzettLeiras: "Mindenki",
    });
  });

  it("validates a körüzenet: link must be app-relative or https", () => {
    const alap = {
      tipus: "koruzenet",
      cim: "Hello",
      cimzettek: { mindenki: true },
    };
    expect(koruzenetSchema.safeParse({ ...alap, url: "/feladatok" }).success).toBe(true);
    expect(koruzenetSchema.safeParse({ ...alap, url: "https://x.hu/a" }).success).toBe(
      true,
    );
    expect(
      koruzenetSchema.safeParse({ ...alap, url: "javascript:alert(1)" }).success,
    ).toBe(false);
    expect(koruzenetSchema.safeParse({ ...alap, url: "//evil.com" }).success).toBe(false);
    expect(koruzenetSchema.safeParse({ ...alap, cim: "  " }).success).toBe(false);
    expect(koruzenetSchema.safeParse({ ...alap, tipus: "rendszer" }).success).toBe(false);
  });
});

describe("e-mail értesítési beállítások (#71)", () => {
  it("everything is off by default and nobody gets an e-mail", async () => {
    const anna = await fiok("Anna");
    expect(await jelzesApi.emailBeallitasok(anna)).toEqual({
      feladat_uj: false,
      feladat_valtozas: false,
      jelzes: false,
    });
    expect(await jelzesApi.emailCimzettek([anna], "feladat_uj")).toEqual([]);
    expect(await jelzesApi.emailCimzettek([anna], "jelzes")).toEqual([]);
  });

  it("opting into one category sends only that one, only to active users", async () => {
    const anna = await fiok("Anna");
    const bela = await fiok("Bela");
    const inaktiv = await fiok("Cecil", { isActive: false });
    expect(await jelzesApi.mentEmailBeallitasok(anna, { feladat_uj: true })).toEqual({
      feladat_uj: true,
      feladat_valtozas: false,
      jelzes: false,
    });
    await jelzesApi.mentEmailBeallitasok(inaktiv, { feladat_uj: true });

    const uj = await jelzesApi.emailCimzettek(
      [anna, bela, inaktiv, "nem-id"],
      "feladat_uj",
    );
    expect(uj).toEqual([{ id: anna, email: "anna@example.com", nev: "Anna" }]);
    expect(await jelzesApi.emailCimzettek([anna, bela], "feladat_valtozas")).toEqual([]);

    // Switching off again stops it; unknown keys are ignored.
    await jelzesApi.mentEmailBeallitasok(anna, {
      feladat_uj: false,
      ...({ vmi: true } as object),
    });
    expect(await jelzesApi.emailCimzettek([anna], "feladat_uj")).toEqual([]);
    expect(await jelzesApi.emailBeallitasok(anna)).toEqual({
      feladat_uj: false,
      feladat_valtozas: false,
      jelzes: false,
    });
  });
});
