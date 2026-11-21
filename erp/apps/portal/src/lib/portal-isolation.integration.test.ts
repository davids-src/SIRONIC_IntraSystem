import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB } from "@erp/db-core";
import { bizonylatApi } from "@erp/bizonylat";
import { igazolasSchema, jotallasSchema, szamlaSchema } from "@erp/bizonylat/validation";
import { deploymentsApi } from "@erp/deployments";
import { projektApi } from "@erp/projekt";
import { szervizApi } from "@erp/szerviz";
import {
  invitePortalUser,
  ensurePortalRoles,
  PORTAL_PERMISSIONS,
  type PortalIdentity,
} from "@erp/portal-auth";
import { buildPortalNezo, type PortalNezo } from "./nezo";
import * as api from "./portal-api";

let mongo: MongoMemoryServer;

const staffId = new mongoose.Types.ObjectId().toString();
const szereplo = { id: staffId, nev: "Belső Munkatárs" };
const staffNezo = { kind: "staff" as const, userId: staffId, belsoLathato: true };

const SECRET_COMMENT = "INTERNAL-SECRET-COMMENT";
const SECRET_NOTE = "INTERNAL-SECRET-NOTE";
const SECRET_PURCHASE = 7777.77;
const SECRET_BILLINGO = "B-REF-SECRET";
const SECRET_CERT_NOTE = "INTERNAL-SECRET-CERT-NOTE";
const LEAKS = [
  SECRET_COMMENT,
  SECRET_NOTE,
  "7777",
  SECRET_BILLINGO,
  SECRET_CERT_NOTE,
  "belsoAlapar",
  "beszerzesiEgysegar",
];

function identity(
  partnerId: string,
  portalUserId: string,
  admin: boolean,
): PortalIdentity {
  const all = Object.values(PORTAL_PERMISSIONS) as string[];
  return {
    portalUserId,
    email: `${portalUserId}@x.hu`,
    name: `Portál ${partnerId}`,
    partnerId,
    partnerNev: `Partner ${partnerId}`,
    rolak: [admin ? "partner-admin" : "partner-viewer"],
    permissions: admin ? all : [PORTAL_PERMISSIONS.view],
    partnerAdmin: admin,
  };
}

type Seed = {
  jegy: string;
  projekt: string;
  igazolas: string;
  szamla: string;
  jotallas: string;
  telepites: string;
  kolléga: string;
};
const seed: Record<"A" | "B", Seed> = {} as never;

const partnerAdat = (p: string) => ({
  partnerNev: `Partner ${p}`,
  partnerCim: "1111 Budapest",
  partnerEmail: `iroda@${p.toLowerCase()}.example`,
});

async function seedPartner(p: "A" | "B"): Promise<Seed> {
  const partnerId = `partner-${p}`;
  // ticket + internal comment + internal note
  const j = await szervizApi.createHibajegy(
    {
      targy: `Jegy ${p}`,
      leiras: "Leírás",
      partnerId,
      forras: "telefon",
      kategoria: "Általános",
      prioritas: "kozepes",
      belsoJegyzet: SECRET_NOTE,
    } as never,
    { partnerNev: `Partner ${p}` },
    szereplo,
  );
  if (!j.ok) throw new Error(j.message);
  await szervizApi.addMegjegyzes(
    j.id,
    { uzenet: SECRET_COMMENT, belso: true },
    szereplo,
    staffNezo,
  );
  await szervizApi.addMegjegyzes(
    j.id,
    { uzenet: "Látható válasz", belso: false },
    szereplo,
    staffNezo,
  );

  const pr = await projektApi.createProjekt(
    {
      nev: `Projekt ${p}`,
      portalLathato: true,
      partnerId,
      partnerNev: `Partner ${p}`,
    } as never,
    szereplo,
  );
  if (!pr.ok || !pr.id) throw new Error("projekt");

  const ig = await bizonylatApi.createIgazolas(
    igazolasSchema.parse({
      cim: `Igazolás ${p}`,
      partnerId,
      munkaOsszegzes: "Kész",
      sorok: [
        {
          leiras: "Munka",
          mennyiseg: 2,
          egyseg: "óra",
          nettoEgysegar: 9000,
          afaKulcs: 27,
          beszerzesiEgysegar: SECRET_PURCHASE,
        },
      ],
      belsoMegjegyzes: SECRET_CERT_NOTE,
    }),
    partnerAdat(p),
    szereplo,
  );
  if (!ig.ok || !ig.id) throw new Error("igazolas");
  const kuld = await bizonylatApi.kuldIgazolas(ig.id, szereplo, {
    alapUrl: "https://p.example",
  });
  if (!kuld.ok) throw new Error(kuld.message);

  const sz = await bizonylatApi.createSzamla(
    szamlaSchema.parse({
      partnerId,
      sorok: [
        { leiras: "Díj", mennyiseg: 1, egyseg: "db", nettoEgysegar: 10000, afaKulcs: 27 },
      ],
    }),
    partnerAdat(p),
    szereplo,
  );
  if (!sz.ok || !sz.id) throw new Error("szamla");
  const kiall = await bizonylatApi.kiallitSzamla(sz.id, szereplo, {
    async kiallit() {
      return { ok: true as const, billingoRef: SECRET_BILLINGO, szamlaszam: `SZ-${p}-1` };
    },
    async allapot() {
      return { ok: true as const, kifizetve: false };
    },
  });
  expect(kiall.ok).toBe(true);

  const jo = await bizonylatApi.createJotallas(
    jotallasSchema.parse({
      partnerId,
      kiallitasNap: "2026-11-21",
      sorok: [{ termekNev: "Kamera", evek: 2, kezdet: "2026-11-21" }],
      megjegyzes: SECRET_NOTE,
    }),
    partnerAdat(p),
    szereplo,
  );
  if (!jo.ok || !jo.id) throw new Error("jotallas");

  const t = await deploymentsApi.createTelepites(
    {
      nev: `Oldal ${p}`,
      domain: `oldal-${p.toLowerCase()}.hu`,
      partnerId,
      dns: { rekordTipus: "A", cel: "1.2.3.4" },
      proxy: { celHost: "app", celPort: 3000 },
      image: { repo: "ghcr.io/x/y", tag: "v1" },
      stack: { nev: `partner-${p.toLowerCase()}` },
    } as never,
    staffId,
  );
  if (!t.ok || !t.id) throw new Error(t.ok ? "telepites" : t.message);

  const kolléga = await invitePortalUser({
    email: `kollega-${p.toLowerCase()}@x.hu`,
    name: `Kolléga ${p}`,
    rolak: ["partner-viewer"],
    partnerId,
    partnerNev: `Partner ${p}`,
    invitedBy: staffId,
    inviterName: "Admin",
  });
  if (!kolléga.ok) throw new Error(kolléga.message);

  return {
    jegy: j.id,
    projekt: pr.id,
    igazolas: ig.id,
    szamla: sz.id,
    jotallas: jo.id,
    telepites: t.id,
    kolléga: kolléga.id,
  };
}

let nezoA: PortalNezo;
let nezoB: PortalNezo;
let viewerA: PortalNezo;

beforeAll(async () => {
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  delete process.env.SMTP_HOST;
  await connectDB();
  await ensurePortalRoles();
  seed.A = await seedPartner("A");
  seed.B = await seedPartner("B");
  nezoA = buildPortalNezo(
    identity("partner-A", new mongoose.Types.ObjectId().toString(), true),
  );
  nezoB = buildPortalNezo(
    identity("partner-B", new mongoose.Types.ObjectId().toString(), true),
  );
  viewerA = buildPortalNezo(
    identity("partner-A", new mongoose.Types.ObjectId().toString(), false),
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const noLeak = (label: string, value: unknown) => {
  const s = JSON.stringify(value ?? null);
  for (const l of LEAKS) expect(s, `${label} leaks ${l}`).not.toContain(l);
};

describe("partner A sees its own data (sanity)", () => {
  it("reads every entity of its own partner", async () => {
    expect((await api.portalHibajegy(nezoA, seed.A.jegy))?.targy).toBe("Jegy A");
    expect(await api.portalProjekt(nezoA, seed.A.projekt)).not.toBeNull();
    expect((await api.portalIgazolas(nezoA, seed.A.igazolas))?.cim).toBe("Igazolás A");
    expect(await api.portalSzamla(nezoA, seed.A.szamla)).not.toBeNull();
    expect(await api.portalJotallas(nezoA, seed.A.jotallas)).not.toBeNull();
    expect((await api.portalTelepitesek(nezoA)).map((t) => t.id)).toContain(
      seed.A.telepites,
    );
  });
});

describe("partner A can never READ partner B's data", () => {
  it("detail reads return null for B's ids", async () => {
    expect(await api.portalHibajegy(nezoA, seed.B.jegy)).toBeNull();
    expect(await api.portalProjekt(nezoA, seed.B.projekt)).toBeNull();
    expect(await api.portalIgazolas(nezoA, seed.B.igazolas)).toBeNull();
    expect(await api.portalSzamla(nezoA, seed.B.szamla)).toBeNull();
    expect(await api.portalJotallas(nezoA, seed.B.jotallas)).toBeNull();
  });

  it("lists contain only A's rows", async () => {
    const ids = {
      jegy: (await api.portalHibajegyek(nezoA)).data.map((x) => x._id),
      projekt: (await api.portalProjektek(nezoA)).data.map((x) => x._id),
      igazolas: (await api.portalIgazolasok(nezoA)).data.map((x) => x._id),
      szamla: (await api.portalSzamlak(nezoA)).data.map((x) => x.id),
      jotallas: (await api.portalJotallasok(nezoA)).data.map((x) => x.id),
      telepites: (await api.portalTelepitesek(nezoA)).map((x) => x.id),
    };
    for (const k of Object.keys(ids) as Array<keyof typeof ids>) {
      expect(ids[k], k).toContain(seed.A[k]);
      expect(ids[k], `${k} (B)`).not.toContain(seed.B[k]);
      expect(ids[k]).toHaveLength(1);
    }
  });

  it("the dashboard counts only own data", async () => {
    const d = await api.portalMuszerfal(nezoA);
    expect(d).toMatchObject({ nyitottHibajegy: 1, fuggoIgazolas: 1, telepitesDb: 1 });
  });
});

describe("partner A can never WRITE to partner B's data", () => {
  it("cannot comment on B's ticket", async () => {
    const r = await api.portalHibajegyHozzaszol(nezoA, seed.B.jegy, "betörés");
    expect(r.ok).toBe(false);
    const b = await api.portalHibajegy(nezoB, seed.B.jegy);
    expect(JSON.stringify(b)).not.toContain("betörés");
  });

  it("a created ticket always belongs to the viewer's partner (no partner input exists)", async () => {
    const r = await api.portalHibajegyLetrehoz(nezoA, {
      targy: "Új A jegy",
      leiras: "x",
      // hostile extras are ignored by the schema
      ...({ partnerId: "partner-B", forras: "crm", belsoJegyzet: "x" } as object),
    });
    expect(r.ok).toBe(true);
    const id = (r as { id: string }).id;
    expect(await api.portalHibajegy(nezoB, id)).toBeNull();
    const own = await api.portalHibajegy(nezoA, id);
    expect(own?.targy).toBe("Új A jegy");
    const staff = await szervizApi.getHibajegy(id, staffNezo);
    expect(staff).toMatchObject({ partnerId: "partner-A", forras: "portal" });
  });

  it("cannot accept or reject B's certificate", async () => {
    const kep = `data:image/png;base64,${"A".repeat(400)}`;
    const a = await api.portalIgazolasElfogad(nezoA, seed.B.igazolas, {
      nev: "Támadó",
      beosztas: "x",
      kep,
    });
    const r = await api.portalIgazolasElutasit(nezoA, seed.B.igazolas, { ok: "támadás" });
    expect(a.ok).toBe(false);
    expect(r.ok).toBe(false);
    expect((await api.portalIgazolas(nezoB, seed.B.igazolas))?.allapot).toBe("elkuldve");
  });

  it("cannot grant access to B's deployment, nor grant B's colleague access to its own", async () => {
    const otherDeployment = await api.portalHozzaferesBeallit(nezoA, {
      portalFelhasznaloId: seed.A.kolléga,
      telepitesId: seed.B.telepites,
      engedelyezve: true,
    });
    expect(otherDeployment.ok).toBe(false);
    const foreignUser = await api.portalHozzaferesBeallit(nezoA, {
      portalFelhasznaloId: seed.B.kolléga,
      telepitesId: seed.A.telepites,
      engedelyezve: true,
    });
    expect(foreignUser.ok).toBe(false);
    expect(await api.portalHozzaferesek(nezoA, seed.B.telepites)).toEqual([]);
    expect(await deploymentsApi.listHozzaferesek(seed.B.telepites)).toEqual([]);
  });

  it("cannot manage B's colleagues", async () => {
    expect((await api.portalCsapattagAktiv(nezoA, seed.B.kolléga, false)).ok).toBe(false);
    expect(
      (await api.portalCsapattagSzerepkor(nezoA, seed.B.kolléga, ["partner-admin"])).ok,
    ).toBe(false);
    expect(await api.portalCsapattag(nezoA, seed.B.kolléga)).toBeNull();
    expect((await api.portalCsapat(nezoA)).map((c) => c.id)).not.toContain(
      seed.B.kolléga,
    );
  });

  it("an invitation always lands in the inviter's own partner", async () => {
    const r = await api.portalMeghiv(nezoA, {
      email: "uj@a.hu",
      name: "Új",
      rolak: ["partner-viewer"],
      ...({ partnerId: "partner-B" } as object),
    });
    expect(r.ok).toBe(true);
    const csapatA = (await api.portalCsapat(nezoA)).map((c) => c.email);
    const csapatB = (await api.portalCsapat(nezoB)).map((c) => c.email);
    expect(csapatA).toContain("uj@a.hu");
    expect(csapatB).not.toContain("uj@a.hu");
  });
});

describe("deployment access grants scope a partner viewer", () => {
  it("a non-admin sees only granted deployments of its own partner", async () => {
    const kolléga = buildPortalNezo(identity("partner-A", seed.A.kolléga, false));
    expect(await api.portalTelepitesek(kolléga)).toEqual([]);
    const g = await api.portalHozzaferesBeallit(nezoA, {
      portalFelhasznaloId: seed.A.kolléga,
      telepitesId: seed.A.telepites,
      engedelyezve: true,
    });
    expect(g.ok).toBe(true);
    expect((await api.portalTelepitesek(kolléga)).map((t) => t.id)).toEqual([
      seed.A.telepites,
    ]);
    await api.portalHozzaferesBeallit(nezoA, {
      portalFelhasznaloId: seed.A.kolléga,
      telepitesId: seed.A.telepites,
      engedelyezve: false,
    });
    expect(await api.portalTelepitesek(kolléga)).toEqual([]);
  });
});

describe("permissions of the portal roles", () => {
  it("a viewer cannot create tickets, comment, decide certificates or manage the team", async () => {
    expect(
      (await api.portalHibajegyLetrehoz(viewerA, { targy: "x", leiras: "y" })).ok,
    ).toBe(false);
    expect((await api.portalHibajegyHozzaszol(viewerA, seed.A.jegy, "x")).ok).toBe(false);
    expect(
      (await api.portalIgazolasElutasit(viewerA, seed.A.igazolas, { ok: "x" })).ok,
    ).toBe(false);
    expect(await api.portalCsapat(viewerA)).toEqual([]);
    expect(
      (
        await api.portalMeghiv(viewerA, {
          email: "z@a.hu",
          name: "Z",
          rolak: ["partner-viewer"],
        })
      ).ok,
    ).toBe(false);
  });

  it("a portal comment is never internal", async () => {
    const r = await api.portalHibajegyHozzaszol(nezoA, seed.A.jegy, "Partneri üzenet");
    expect(r.ok).toBe(true);
    const staffView = await szervizApi.getHibajegy(seed.A.jegy, staffNezo);
    const m = staffView?.megjegyzesek.find((x) => x.uzenet === "Partneri üzenet");
    expect(m).toMatchObject({ belso: false, szerepkor: "partner" });
  });
});

describe("internal data never appears in any portal response", () => {
  it("scans every portal read for secrets", async () => {
    // Sanity: the secrets exist for staff, so the scan is meaningful.
    const staffJegy = JSON.stringify(
      await szervizApi.getHibajegy(seed.A.jegy, staffNezo),
    );
    expect(staffJegy).toContain(SECRET_COMMENT);
    expect(staffJegy).toContain(SECRET_NOTE);
    expect(
      JSON.stringify(await bizonylatApi.getIgazolas(seed.A.igazolas, staffNezo)),
    ).toContain("7777");
    expect(JSON.stringify(await bizonylatApi.getSzamla(seed.A.szamla))).toContain(
      SECRET_BILLINGO,
    );

    noLeak("hibajegyek", await api.portalHibajegyek(nezoA));
    noLeak("hibajegy", await api.portalHibajegy(nezoA, seed.A.jegy));
    noLeak("projektek", await api.portalProjektek(nezoA));
    noLeak("projekt", await api.portalProjekt(nezoA, seed.A.projekt));
    noLeak("munkalapok", await api.portalMunkalapok(nezoA));
    noLeak("igazolasok", await api.portalIgazolasok(nezoA));
    noLeak("igazolas", await api.portalIgazolas(nezoA, seed.A.igazolas));
    noLeak("szamlak", await api.portalSzamlak(nezoA));
    noLeak("szamla", await api.portalSzamla(nezoA, seed.A.szamla));
    noLeak("jotallasok", await api.portalJotallasok(nezoA));
    noLeak("jotallas", await api.portalJotallas(nezoA, seed.A.jotallas));
    noLeak("telepitesek", await api.portalTelepitesek(nezoA));
    noLeak("fizetesek", await api.portalFizetesek(nezoA));
    noLeak("muszerfal", await api.portalMuszerfal(nezoA));
    noLeak("csapat", await api.portalCsapat(nezoA));
  });

  it("the magic-link detail is allow-listed too", async () => {
    // the token itself is minted by kuldIgazolas; resolve it via a fresh send
    const kuld = await bizonylatApi.kuldIgazolas(seed.A.igazolas, szereplo, {
      alapUrl: "https://p.example",
    });
    if (!kuld.ok) throw new Error(kuld.message);
    const token = kuld.level.linkUt.split("/").pop()!;
    const d = await bizonylatApi.getIgazolasTokennel(token);
    expect(d?.cim).toBe("Igazolás A");
    noLeak("token-igazolas", d);
  });
});

describe("an empty partner id matches nothing", () => {
  it("returns no rows for a viewer without a partner", async () => {
    const ghost = buildPortalNezo(
      identity("", new mongoose.Types.ObjectId().toString(), true),
    );
    expect((await api.portalHibajegyek(ghost)).total).toBe(0);
    expect((await api.portalProjektek(ghost)).total).toBe(0);
    expect((await api.portalIgazolasok(ghost)).total).toBe(0);
    expect((await api.portalSzamlak(ghost)).total).toBe(0);
    expect((await api.portalJotallasok(ghost)).total).toBe(0);
    expect(await api.portalTelepitesek(ghost)).toEqual([]);
  });
});
