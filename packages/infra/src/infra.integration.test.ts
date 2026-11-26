import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB } from "@erp/db-core";
import { infraApi } from "./api";
import { kliensGyarBeallit } from "./kontextus";
import {
  InfraEsemeny,
  InfraHozzaferes,
  InfraOldal,
  InfraSablon,
  InfraStack,
  InfraWebhely,
  IntegracioKapcsolat,
} from "./models";

let mongo: MongoMemoryServer;
const AKTOR = "user-1";

// ---------------------------------------------------------------- fake providers

type FakeStack = {
  Id: number;
  Name: string;
  Env: Array<{ name: string; value: string }>;
  file: string;
};
const COMPOSE =
  "services:\n  web:\n    image: ghcr.io/x/web:main\n    container_name: sakk_web\n  api:\n    image: ghcr.io/x/api:latest\n    container_name: sakk_api\n";

function ctr(name: string, stackId: number, service: string, state = "running") {
  return {
    Id: `id-${name}`,
    Names: [`/${name}`],
    Image: `ghcr.io/x/${service}:main`,
    ImageID: `sha-${name}`,
    State: state,
    Labels: {
      "com.docker.compose.project.working_dir": `/data/compose/${stackId}`,
      "com.docker.compose.service": service,
    },
  };
}

function fakes() {
  const state = {
    stacks: [
      { Id: 65, Name: "sakkmed", Env: [{ name: "A", value: "1" }], file: COMPOSE },
      { Id: 16, Name: "365daysdarts", Env: [], file: COMPOSE },
    ] as FakeStack[],
    containers: [
      ctr("sakk_web", 65, "web"),
      ctr("sakk_api", 65, "api"),
      ctr("365daysdarts", 16, "web"),
      ctr("orphan", 999, "x", "exited"),
    ],
    zones: [
      { id: "z-sakk", name: "sakkmed.hu", status: "active", name_servers: [] },
      { id: "z-dart", name: "365daysdarts.com", status: "active", name_servers: [] },
    ],
    dns: [] as Array<{
      id: string;
      type: string;
      name: string;
      content: string;
      proxied?: boolean;
    }>,
    certs: [
      {
        id: 58,
        provider: "letsencrypt",
        domain_names: ["admin.sakkmed.hu", "api.sakkmed.hu"],
        expires_on: "2099-01-01 00:00:00",
        meta: { letsencrypt_email: "ops@x.hu" },
      },
    ],
    hosts: [
      {
        id: 9,
        domain_names: ["365daysdarts.com", "www.365daysdarts.com"],
        forward_scheme: "http",
        forward_host: "365daysdarts",
        forward_port: 3000,
        certificate_id: 21,
        ssl_forced: false,
        allow_websocket_upgrade: true,
        enabled: true,
      },
      {
        id: 20,
        domain_names: ["api.sakkmed.hu"],
        forward_scheme: "http",
        forward_host: "sakk_api",
        forward_port: 8000,
        certificate_id: 58,
        ssl_forced: true,
        allow_websocket_upgrade: true,
        enabled: true,
      },
    ] as Array<Record<string, unknown>>,
  };
  const calls = {
    cfUpsert: vi.fn(),
    npmCreateCert: vi.fn(),
    npmCreateHost: vi.fn(),
    npmUpdateHost: vi.fn(),
    updateStack: vi.fn(),
    deleteStack: vi.fn(),
    containerAction: vi.fn(),
  };
  let next = 100;
  const portainer = {
    listStacks: async () => state.stacks,
    getStack: async (id: number) => state.stacks.find((s) => s.Id === id)!,
    getStackFile: async (id: number) => state.stacks.find((s) => s.Id === id)!.file,
    listContainers: async () => state.containers,
    listImages: async () => [],
    updateStack: async (...a: unknown[]) => void calls.updateStack(...a),
    deleteStack: async (...a: unknown[]) => void calls.deleteStack(...a),
    startStack: async () => undefined,
    stopStack: async () => undefined,
    createStackStandalone: async (name: string) => {
      state.stacks.push({ Id: 200, Name: name, Env: [], file: COMPOSE });
      return { id: 200 };
    },
    containerAction: async (...a: unknown[]) => void calls.containerAction(...a),
    getContainerLogs: async () => "log",
    getStatus: async () => ({ ok: true }),
    triggerWebhook: async () => undefined,
  };
  const cloudflare = {
    verifyToken: async () => ({ ok: true }),
    listZones: async () => state.zones,
    listDnsRecords: async () => state.dns,
    upsertDnsRecord: async (
      zone: string,
      r: { type: string; name: string; content: string; proxied?: boolean },
    ) => {
      calls.cfUpsert(zone, r);
      const rec = { id: `r${next++}`, ...r };
      state.dns.push(rec);
      return { id: rec.id };
    },
    deleteDnsRecord: async () => undefined,
  };
  const npm = {
    getVersion: async () => ({ major: 2, minor: 13, revision: 7 }),
    listProxyHosts: async () => state.hosts,
    listCertificates: async () => state.certs,
    createCertificate: async (i: {
      domainNames: string[];
      dnsProviderCredentials: string;
    }) => {
      calls.npmCreateCert(i);
      const c = {
        id: next++,
        provider: "letsencrypt",
        domain_names: i.domainNames,
        expires_on: "2099-01-01 00:00:00",
        meta: {},
      };
      state.certs.push(c);
      return { id: c.id };
    },
    createProxyHost: async (i: Record<string, unknown>) => {
      calls.npmCreateHost(i);
      const id = next++;
      state.hosts.push({
        id,
        domain_names: i.domainNames,
        forward_scheme: i.forwardScheme,
        forward_host: i.forwardHost,
        forward_port: i.forwardPort,
        certificate_id: i.certificateId,
        enabled: true,
      });
      return { id };
    },
    updateProxyHost: async (id: number, i: Record<string, unknown>) =>
      void calls.npmUpdateHost(id, i),
    deleteProxyHost: async () => undefined,
    renewCertificate: async () => undefined,
    setProxyHostEnabled: async () => undefined,
  };
  return { state, calls, portainer, cloudflare, npm };
}

let F: ReturnType<typeof fakes>;

async function integraciok() {
  for (const [szolgaltato, hitelesito, alapUrl] of [
    ["portainer", { api_key: "k" }, "https://p.local"],
    [
      "cloudflare",
      { api_token: "cf-secret-token" },
      "https://api.cloudflare.com/client/v4/",
    ],
    ["npm", { email: "a@b.hu", password: "pw" }, "http://npm.local"],
  ] as const) {
    const r = await infraApi.createIntegracio(
      { szolgaltato, cimke: szolgaltato, alapUrl, hitelesito: { ...hitelesito } },
      AKTOR,
    );
    expect(r.ok).toBe(true);
  }
}

beforeAll(async () => {
  process.env.SECRETS_ENCRYPTION_KEY = "0".repeat(64);
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
  for (const m of [
    InfraStack,
    InfraOldal,
    IntegracioKapcsolat,
    InfraSablon,
    InfraWebhely,
    InfraHozzaferes,
  ])
    await m.init();
}, 120_000);
afterAll(async () => {
  kliensGyarBeallit(null);
  await mongoose.disconnect();
  await mongo.stop();
});
beforeEach(async () => {
  F = fakes();
  kliensGyarBeallit(
    (k) =>
      ({ portainer: F.portainer, cloudflare: F.cloudflare, npm: F.npm })[k.szolgaltato],
  );
  await integraciok();
});
afterEach(async () => {
  await Promise.all(
    [
      InfraStack,
      InfraOldal,
      InfraEsemeny,
      IntegracioKapcsolat,
      InfraSablon,
      InfraWebhely,
      InfraHozzaferes,
    ].map((m) => m.deleteMany({})),
  );
});

describe("szinkron", () => {
  it("stackeket és oldalakat vesz fel, az oldalt a konténer neve alapján a stackhez köti", async () => {
    const r = await infraApi.szinkron(AKTOR);
    expect(r.ok).toBe(true);
    const stackek = await InfraStack.find().lean();
    expect(stackek.map((s) => s.nev).sort()).toEqual(["365daysdarts", "sakkmed"]);
    const sakk = stackek.find((s) => s.nev === "sakkmed")!;
    const api = await InfraOldal.findOne({ hostnevek: "api.sakkmed.hu" }).lean();
    expect(api?.stackId).toBe(String(sakk._id));
    expect(api?.szolgaltatas).toBe("sakk_api");
    expect(api?.port).toBe(8000);
    expect(api?.kulsoIdk.npmTanusitvanyId).toBe(58);
    // a 365daysdarts host a saját stackjéhez kötődik, www alias ugyanabban az oldalban
    const dart = await InfraOldal.findOne({ hostnevek: "365daysdarts.com" }).lean();
    expect(dart?.hostnevek).toEqual(["365daysdarts.com", "www.365daysdarts.com"]);
  });

  it("újrafuttatva nem duplikál és megőrzi a partnert", async () => {
    await infraApi.szinkron(AKTOR);
    const o = (await InfraOldal.findOne({ hostnevek: "api.sakkmed.hu" }))!;
    o.partnerId = "partner-1";
    await o.save();
    const r = await infraApi.szinkron(AKTOR);
    expect(r.ok).toBe(true);
    expect(await InfraOldal.countDocuments()).toBe(2);
    expect((await InfraOldal.findById(o._id).lean())?.partnerId).toBe("partner-1");
  });

  it("párhuzamos szinkron sem hoz létre kétszer ugyanazt a stacket", async () => {
    await Promise.all([
      infraApi.szinkron(AKTOR),
      infraApi.szinkron(AKTOR),
      infraApi.szinkron(AKTOR),
    ]);
    expect(await InfraStack.countDocuments()).toBe(2);
    expect(await InfraOldal.countDocuments()).toBe(2);
  });

  it("a Portainerről eltűnt stacket elveszettnek jelöli", async () => {
    await infraApi.szinkron(AKTOR);
    F.state.stacks = F.state.stacks.filter((s) => s.Id !== 16);
    await infraApi.szinkron(AKTOR);
    expect((await InfraStack.findOne({ nev: "365daysdarts" }).lean())?.elveszett).toBe(
      true,
    );
  });
});

describe("stackek", () => {
  it("listázza az állapotot és a stacktől független konténereket", async () => {
    const { stackek, arva } = await infraApi.listStackek();
    const sakk = stackek.find((s) => s.nev === "sakkmed")!;
    expect(sakk.allapot).toBe("fut");
    expect(sakk.konteneriSzam).toBe(2);
    expect(arva.map((c) => c.nev)).toEqual(["orphan"]);
  });

  it("image frissítésnél pull-lal és a MEGLÉVŐ env-vel telepít újra", async () => {
    const { stackek } = await infraApi.listStackek();
    const sakk = stackek.find((s) => s.nev === "sakkmed")!;
    const r = await infraApi.frissitStack(sakk.id, AKTOR);
    expect(r.ok).toBe(true);
    expect(F.calls.updateStack).toHaveBeenCalledWith(
      65,
      COMPOSE,
      [{ name: "A", value: "1" }],
      { pullImage: true },
    );
    const esemeny = await InfraEsemeny.findOne({ muvelet: "stack.frissit" }).lean();
    expect(esemeny?.ok).toBe(true);
  });

  it("hibás compose-t nem küld el a Portainernek", async () => {
    const { stackek } = await infraApi.listStackek();
    const r = await infraApi.mentesStack(
      stackek[0]!.id,
      { compose: "services: [" },
      AKTOR,
    );
    expect(r.ok).toBe(false);
    expect(F.calls.updateStack).not.toHaveBeenCalled();
  });

  it("mentésnél naplózza az image-változást, de a compose-t és az env-et nem", async () => {
    const { stackek } = await infraApi.listStackek();
    const sakk = stackek.find((s) => s.nev === "sakkmed")!;
    const uj = COMPOSE.replace("web:main", "web:v2");
    const r = await infraApi.mentesStack(
      sakk.id,
      { compose: uj, env: [{ name: "SECRET", value: "titok-ertek" }] },
      AKTOR,
    );
    expect(r.ok).toBe(true);
    const e = await InfraEsemeny.findOne({ muvelet: "stack.mentes" }).lean();
    expect(JSON.stringify(e)).toContain("web:v2");
    expect(JSON.stringify(e)).not.toContain("titok-ertek");
  });

  it("egy szolgáltatás image-ét átírja a compose többi részének érintése nélkül", async () => {
    const { stackek } = await infraApi.listStackek();
    const sakk = stackek.find((s) => s.nev === "sakkmed")!;
    const r = await infraApi.imageBeallit(sakk.id, "web", "ghcr.io/x/web:v9", {}, AKTOR);
    expect(r.ok).toBe(true);
    const [, compose, env, opts] = F.calls.updateStack.mock.calls[0]!;
    expect(compose).toContain("image: ghcr.io/x/web:v9");
    expect(compose).toContain("image: ghcr.io/x/api:latest");
    expect(env).toEqual([{ name: "A", value: "1" }]);
    expect(opts).toEqual({ pullImage: true });
    expect((await infraApi.imageBeallit(sakk.id, "nincs", "x:1", {}, AKTOR)).ok).toBe(
      false,
    );
  });

  it("env változót állít és töröl, a többit megtartva", async () => {
    const { stackek } = await infraApi.listStackek();
    const sakk = stackek.find((s) => s.nev === "sakkmed")!;
    await infraApi.envBeallit(sakk.id, "B", "2", AKTOR);
    expect(F.calls.updateStack.mock.calls[0]![2]).toEqual([
      { name: "A", value: "1" },
      { name: "B", value: "2" },
    ]);
    await infraApi.envBeallit(sakk.id, "A", null, AKTOR);
    expect(F.calls.updateStack.mock.calls[1]![2]).toEqual([]);
  });

  it("a stacket név, Portainer id és Mongo id alapján is azonosítja; az ismeretlent elutasítja", async () => {
    await infraApi.szinkron(AKTOR);
    const sakk = (await InfraStack.findOne({ nev: "sakkmed" }))!;
    expect(await infraApi.stackAzonosit("sakkmed")).toBe(String(sakk._id));
    expect(await infraApi.stackAzonosit("65")).toBe(String(sakk._id));
    expect(await infraApi.stackAzonosit(String(sakk._id))).toBe(String(sakk._id));
    await expect(infraApi.stackAzonosit("nincs-ilyen")).rejects.toThrow(/Nincs/);
    await InfraStack.create({ nev: "sakkmed", portainerStackId: 77 });
    await expect(infraApi.stackAzonosit("sakkmed")).rejects.toThrow(/Több/);
  });

  it("új stacket hoz létre, érvénytelen névvel nem", async () => {
    expect(
      (await infraApi.ujStack({ nev: "Rossz Nev", compose: COMPOSE }, AKTOR)).ok,
    ).toBe(false);
    const r = await infraApi.ujStack(
      { nev: "uj-projekt", compose: COMPOSE, tipus: "projekt" },
      AKTOR,
    );
    expect(r.ok).toBe(true);
    expect(await InfraStack.countDocuments({ nev: "uj-projekt" })).toBe(1);
  });

  it("oldalakkal rendelkező stacket nem töröl, a nevet meg kell erősíteni", async () => {
    await infraApi.szinkron(AKTOR);
    const sakk = (await InfraStack.findOne({ nev: "sakkmed" }))!;
    expect((await infraApi.torolStack(String(sakk._id), "sakkmed", AKTOR)).ok).toBe(
      false,
    );
    const dart = (await InfraStack.findOne({ nev: "365daysdarts" }))!;
    expect((await infraApi.torolStack(String(dart._id), "rossz", AKTOR)).ok).toBe(false);
    await InfraOldal.deleteMany({ stackId: String(dart._id) });
    expect((await infraApi.torolStack(String(dart._id), "365daysdarts", AKTOR)).ok).toBe(
      true,
    );
    expect(F.calls.deleteStack).toHaveBeenCalledWith(16);
  });

  it("csak a stackhez tartozó konténert indítja újra", async () => {
    const { stackek } = await infraApi.listStackek();
    const sakk = stackek.find((s) => s.nev === "sakkmed")!;
    expect((await infraApi.konteinerUjraindit(sakk.id, "sakk_api", AKTOR)).ok).toBe(true);
    expect(F.calls.containerAction).toHaveBeenCalledWith("id-sakk_api", "restart");
    expect((await infraApi.konteinerUjraindit(sakk.id, "orphan", AKTOR)).ok).toBe(false);
  });
});

describe("oldalak", () => {
  it("új oldal: DNS → meglévő tanúsítvány újrahasznosítása → proxy host", async () => {
    await infraApi.szinkron(AKTOR);
    const sakk = (await InfraStack.findOne({ nev: "sakkmed" }))!;
    const r = await infraApi.ujOldal(
      {
        hostnevek: ["admin.sakkmed.hu"],
        stackId: String(sakk._id),
        szolgaltatas: "sakk_web",
        port: 3000,
        dns: { tipus: "CNAME", cel: "sironic.asuscomm.com", proxied: true },
      },
      AKTOR,
    );
    expect(r.ok).toBe(true);
    expect(r.lepesek.map((l) => l.kulcs)).toEqual(["dns", "ssl", "proxy"]);
    expect(F.calls.cfUpsert).toHaveBeenCalledWith(
      "z-sakk",
      expect.objectContaining({ type: "CNAME", name: "admin.sakkmed.hu", proxied: true }),
    );
    expect(F.calls.npmCreateCert).not.toHaveBeenCalled(); // a #58-as tanúsítvány lefedi
    expect(F.calls.npmCreateHost).toHaveBeenCalledWith(
      expect.objectContaining({
        forwardHost: "sakk_web",
        forwardPort: 3000,
        certificateId: 58,
      }),
    );
  });

  it("nem fedő tanúsítványnál DNS-01 kéréssel újat állít ki a Cloudflare tokennel", async () => {
    const r = await infraApi.ujOldal(
      {
        hostnevek: ["uj.365daysdarts.com", "www.uj.365daysdarts.com"],
        szolgaltatas: "10.0.0.5",
        port: 80,
        dns: { tipus: "A", cel: "1.2.3.4" },
      },
      AKTOR,
    );
    expect(r.ok).toBe(true);
    const call = F.calls.npmCreateCert.mock.calls[0]![0] as {
      domainNames: string[];
      dnsProviderCredentials: string;
    };
    expect(call.domainNames).toEqual(["uj.365daysdarts.com", "www.uj.365daysdarts.com"]);
    expect(call.dnsProviderCredentials).toContain(
      "dns_cloudflare_api_token = cf-secret-token",
    );
    // a naplóban a token nem szerepelhet
    expect(JSON.stringify(await InfraEsemeny.find().lean())).not.toContain(
      "cf-secret-token",
    );
  });

  it("ismeretlen zónánál a DNS lépésnél megáll, nem hoz létre semmit", async () => {
    const r = await infraApi.ujOldal(
      {
        hostnevek: ["valami.ismeretlen.org"],
        szolgaltatas: "x",
        port: 80,
        dns: { tipus: "A", cel: "1.2.3.4" },
      },
      AKTOR,
    );
    expect(r.ok).toBe(false);
    expect(r.lepesek).toEqual([expect.objectContaining({ kulcs: "dns", ok: false })]);
    expect(F.calls.npmCreateHost).not.toHaveBeenCalled();
    expect(await InfraOldal.countDocuments()).toBe(0);
  });

  it("nem létező szolgáltatást a stackben elutasít", async () => {
    await infraApi.szinkron(AKTOR);
    const sakk = (await InfraStack.findOne({ nev: "sakkmed" }))!;
    const r = await infraApi.ujOldal(
      {
        hostnevek: ["x.sakkmed.hu"],
        stackId: String(sakk._id),
        szolgaltatas: "nincs-ilyen",
        port: 80,
        dns: { tipus: "A", cel: "1.2.3.4" },
      },
      AKTOR,
    );
    expect(r.ok).toBe(false);
    expect(r.message).toContain("nincs-ilyen");
    expect(F.calls.cfUpsert).not.toHaveBeenCalled();
  });

  it("foglalt hostnevet nem vesz fel újra", async () => {
    await infraApi.szinkron(AKTOR);
    const r = await infraApi.ujOldal(
      {
        hostnevek: ["api.sakkmed.hu"],
        szolgaltatas: "sakk_api",
        port: 8000,
        dns: { tipus: "A", cel: "1.2.3.4" },
      },
      AKTOR,
    );
    expect(r.ok).toBe(false);
  });

  it("a cél módosítása csak a proxy hosthoz nyúl (nincs DNS/SSL)", async () => {
    await infraApi.szinkron(AKTOR);
    const o = (await InfraOldal.findOne({ hostnevek: "api.sakkmed.hu" }))!;
    const r = await infraApi.modositOldal(String(o._id), { port: 8001 }, AKTOR);
    expect(r.ok).toBe(true);
    expect(r.lepesek.map((l) => l.kulcs)).toEqual(["proxy"]);
    expect(F.calls.cfUpsert).not.toHaveBeenCalled();
    expect(F.calls.npmUpdateHost).toHaveBeenCalledWith(
      20,
      expect.objectContaining({ forwardPort: 8001 }),
    );
    expect((await InfraOldal.findById(o._id).lean())?.port).toBe(8001);
  });

  it("a partner módosítása nem érinti a szolgáltatókat", async () => {
    await infraApi.szinkron(AKTOR);
    const o = (await InfraOldal.findOne({ hostnevek: "api.sakkmed.hu" }))!;
    const r = await infraApi.modositOldal(
      String(o._id),
      { partnerId: "p-9", megjegyzes: "ügyfél API" },
      AKTOR,
    );
    expect(r.ok).toBe(true);
    expect(r.lepesek).toEqual([]);
    expect(F.calls.npmUpdateHost).not.toHaveBeenCalled();
  });

  it("az ellenőrzés jelzi a hiányzó DNS-t és a leállt konténert", async () => {
    await infraApi.szinkron(AKTOR);
    F.state.containers = F.state.containers.map((c) =>
      c.Names[0] === "/sakk_api" ? { ...c, State: "exited" } : c,
    );
    const o = (await InfraOldal.findOne({ hostnevek: "api.sakkmed.hu" }))!;
    const t = await infraApi.ellenorizOldal(String(o._id), { elerhetoseg: false });
    expect(t.find((x) => x.kulcs === "dns")?.szint).toBe("hiba");
    expect(t.find((x) => x.kulcs === "konteiner")?.szint).toBe("hiba");
    expect(t.find((x) => x.kulcs === "ssl")?.szint).toBe("ok");
    expect(t.find((x) => x.kulcs === "proxy")?.szint).toBe("ok");
  });

  it("törléskor a proxy hostot és kérésre a DNS rekordokat is eltávolítja", async () => {
    await infraApi.szinkron(AKTOR);
    const o = (await InfraOldal.findOne({ hostnevek: "api.sakkmed.hu" }))!;
    expect((await infraApi.torolOldal(String(o._id), { dns: true }, AKTOR)).ok).toBe(
      true,
    );
    expect(await InfraOldal.countDocuments({ hostnevek: "api.sakkmed.hu" })).toBe(0);
  });
});

describe("partner portál", () => {
  it("csak a partner saját oldalait adja, infra-részletek nélkül", async () => {
    await infraApi.szinkron(AKTOR);
    const sakk = (await InfraStack.findOne({ nev: "sakkmed" }))!;
    sakk.partnerId = "p-1";
    await sakk.save();
    const sajat = (await InfraOldal.findOne({ hostnevek: "365daysdarts.com" }))!;
    sajat.partnerId = "p-2";
    await sajat.save();
    const p1 = await infraApi.portalOldalak({ kind: "portal", partnerId: "p-1" });
    expect(p1.map((o) => o.hostnev)).toEqual(["api.sakkmed.hu"]); // a stack partnerétől örökli
    const p2 = await infraApi.portalOldalak({ kind: "portal", partnerId: "p-2" });
    expect(p2.map((o) => o.hostnev)).toEqual(["365daysdarts.com"]);
    expect(Object.keys(p1[0]!).sort()).toEqual([
      "hostnev",
      "hostnevek",
      "id",
      "nev",
      "url",
    ]);
    expect(await infraApi.portalOldalak({ kind: "portal", partnerId: "p-3" })).toEqual(
      [],
    );
  });
});

describe("integrációk", () => {
  it("a hitelesítő adatok sehol nem jelennek meg", async () => {
    const lista = await infraApi.listIntegraciok();
    expect(lista).toHaveLength(3);
    expect(JSON.stringify(lista)).not.toContain("cf-secret-token");
    expect(lista.find((i) => i.szolgaltato === "cloudflare")?.hitelesitoMezok).toEqual([
      "api_token",
    ]);
  });
});

describe("sablonok", () => {
  it("létrehoz, listáz, névvel azonosít, és érvénytelen composet elutasít", async () => {
    const r = await infraApi.ujSablon(
      { nev: "Next app", compose: COMPOSE, env: [{ name: "PORT", value: "3000" }] },
      AKTOR,
    );
    expect(r.ok).toBe(true);
    const lista = await infraApi.listSablonok();
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ nev: "Next app", szolgaltatasok: 2 });
    expect(await infraApi.sablonAzonosit("Next app")).toBe(r.ok ? r.id : "");
    expect(
      (await infraApi.ujSablon({ nev: "Next app", compose: COMPOSE }, AKTOR)).ok,
    ).toBe(false);
    expect(
      (await infraApi.ujSablon({ nev: "Rossz", compose: "nem: yaml: [" }, AKTOR)).ok,
    ).toBe(false);
  });
  it("módosít és töröl", async () => {
    const r = await infraApi.ujSablon({ nev: "Sablon", compose: COMPOSE }, AKTOR);
    const id = r.ok ? r.id! : "";
    expect(
      (
        await infraApi.modositSablon(
          id,
          { nev: "S2", compose: COMPOSE, env: [{ name: "A", value: "1" }] },
          AKTOR,
        )
      ).ok,
    ).toBe(true);
    expect((await infraApi.getSablon(id))?.env).toEqual([{ name: "A", value: "1" }]);
    expect((await infraApi.torolSablon(id, AKTOR)).ok).toBe(true);
    expect(await infraApi.getSablon(id)).toBeNull();
  });
});

describe("webhelyek és hozzáférések", () => {
  const uj = async (extra = {}) => {
    const r = await infraApi.ujWebhely(
      {
        nev: "Pelda WP",
        tipus: "wordpress",
        hostnevek: ["Pelda.HU", "www.pelda.hu"],
        partnerId: "p-1",
        ...extra,
      },
      AKTOR,
    );
    expect(r.ok).toBe(true);
    return r.ok ? r.id! : "";
  };

  it("felvesz normalizált hostnevekkel, ütközést elutasít (webhely és stack-oldal ellen is)", async () => {
    const id = await uj();
    expect((await infraApi.getWebhely(id))?.hostnevek).toEqual([
      "pelda.hu",
      "www.pelda.hu",
    ]);
    expect(
      (await infraApi.ujWebhely({ nev: "Dup", hostnevek: ["pelda.hu"] }, AKTOR)).ok,
    ).toBe(false);
    await InfraOldal.create({
      nev: "o",
      hostnevek: ["stackes.hu"],
      szolgaltatas: "web",
      port: 80,
    });
    expect(
      (await infraApi.ujWebhely({ nev: "X", hostnevek: ["stackes.hu"] }, AKTOR)).ok,
    ).toBe(false);
  });

  it("partnerhez rendel és partnerre szűr", async () => {
    await uj();
    await uj({ nev: "Másik", hostnevek: ["masik.hu"], partnerId: "p-2" });
    const p1 = await infraApi.listWebhelyek({ partnerId: "p-1" });
    expect(p1.map((w) => w.nev)).toEqual(["Pelda WP"]);
  });

  it("a jelszó titkosítva tárolódik, DTO-ban nincs, felfedése naplózott", async () => {
    const id = await uj();
    const h = await infraApi.ujHozzaferes(
      id,
      {
        tipus: "sftp",
        cimke: "Éles SFTP",
        host: "ftp.pelda.hu",
        felhasznalo: "pelda",
        jelszo: "Titok-123",
      },
      AKTOR,
    );
    expect(h.ok).toBe(true);
    const hid = h.ok ? h.id! : "";
    const raw = await InfraHozzaferes.findById(hid).lean();
    expect(raw?.jelszoTitkositott).toBeTruthy();
    expect(raw?.jelszoTitkositott).not.toContain("Titok-123");
    expect(raw?.port).toBe(22);
    const d = await infraApi.getWebhely(id);
    expect(d?.hozzaferesek[0]).toMatchObject({ cimke: "Éles SFTP", vanJelszo: true });
    expect(JSON.stringify(d)).not.toContain("Titok-123");
    expect(JSON.stringify(d)).not.toContain("jelszoTitkositott");

    const f = await infraApi.hozzaferesJelszo(hid, "cli:teszt");
    expect(f.ok && f.jelszo).toBe("Titok-123");
    const ev = await InfraEsemeny.find({ muvelet: "hozzaferes.megtekintes" }).lean();
    expect(ev).toHaveLength(1);
    expect(ev[0]?.szereplo).toBe("cli:teszt");
    expect(JSON.stringify(ev)).not.toContain("Titok-123");
  });

  it("módosításkor az üres jelszó megtartja a régit; jelszó nélküli hozzáférésnél nincs mit felfedni", async () => {
    const id = await uj();
    const h = await infraApi.ujHozzaferes(
      id,
      { cimke: "FTP", host: "ftp.pelda.hu", jelszo: "regi" },
      AKTOR,
    );
    const hid = h.ok ? h.id! : "";
    await infraApi.modositHozzaferes(hid, { cimke: "FTP2", host: "ftp.pelda.hu" }, AKTOR);
    const f = await infraApi.hozzaferesJelszo(hid, AKTOR);
    expect(f.ok && f.jelszo).toBe("regi");
    const n = await infraApi.ujHozzaferes(id, { cimke: "Nincs", host: "x.hu" }, AKTOR);
    expect((await infraApi.hozzaferesJelszo(n.ok ? n.id! : "", AKTOR)).ok).toBe(false);
  });

  it("a webhely törlése a hozzáféréseit is törli", async () => {
    const id = await uj();
    await infraApi.ujHozzaferes(
      id,
      { cimke: "FTP", host: "ftp.pelda.hu", jelszo: "x" },
      AKTOR,
    );
    expect((await infraApi.torolWebhely(id, AKTOR)).ok).toBe(true);
    expect(await InfraHozzaferes.countDocuments({ webhelyId: id })).toBe(0);
  });
});
