import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { createTestMongo } from "@erp/test-utils/mongo-memory";
import { connectDB } from "@erp/db-core";
import { IntegrationError } from "@erp/integrations";
import { deploymentsApi } from "./api";
import { Telepites } from "./models/Telepites";
import {
  Csomag,
  Fizetes,
  IntegracioKapcsolat,
  PartnerTelepitesHozzaferes,
  StackSablon,
  TelepitesEsemeny,
} from "./models/egyeb";
import { esemenyNaploz, LEPES_AKADAS_PERCEK } from "./orchestrator";
import type { LepesKliensek } from "./lepesek/tipusok";
import type { Nezo } from "./constants";

let mongo: MongoMemoryServer;
const SZEREPLO = { id: "user-1" };
const ADMIN = { id: "admin-1", felulirhat: true };

beforeAll(async () => {
  process.env.SECRETS_ENCRYPTION_KEY = "0".repeat(64);
  mongo = await createTestMongo();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
  for (const m of [Telepites, Fizetes, Csomag, IntegracioKapcsolat, PartnerTelepitesHozzaferes]) {
    await m.init();
  }
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await Promise.all(
    [
      Telepites,
      TelepitesEsemeny,
      Fizetes,
      Csomag,
      IntegracioKapcsolat,
      StackSablon,
      PartnerTelepitesHozzaferes,
    ].map((m) => m.deleteMany({})),
  );
});

let szamlalo = 0;
const BEMENET = () => {
  szamlalo += 1;
  return {
    nev: `Teszt ${szamlalo}`,
    domain: `pelda-${szamlalo}.hu`,
    dns: { rekordTipus: "A" as const, cel: "1.2.3.4" },
    proxy: { celHost: "app", celPort: 3000 },
    image: { repo: "ghcr.io/x/y", tag: "v1" },
    stack: { nev: `partner-${szamlalo}` },
  };
};

async function letrehoz(extra: Partial<ReturnType<typeof BEMENET>> & Record<string, unknown> = {}) {
  const r = await deploymentsApi.createTelepites({ ...BEMENET(), ...extra } as never, "u");
  if (!r.ok) throw new Error(r.message);
  return r.id!;
}

const lepes = async (id: string, kulcs: string) =>
  (await Telepites.findById(id).lean())!.lepesek.find((l) => l.kulcs === kulcs)!;
const esemenyek = async (id: string) =>
  TelepitesEsemeny.find({ telepitesId: id }).sort({ createdAt: 1, _id: 1 }).lean();

function fakeCf(over: Record<string, unknown> = {}) {
  return {
    listZones: vi.fn().mockResolvedValue([]),
    createZone: vi
      .fn()
      .mockResolvedValue({ id: "zone-1", nameServers: ["ns1.cf", "ns2.cf"], status: "pending" }),
    getZone: vi.fn(async () => ({ id: "zone-1", name: "x", status: "active", name_servers: [] })),
    triggerActivationCheck: vi.fn().mockResolvedValue(undefined),
    upsertDnsRecord: vi.fn().mockResolvedValue({ id: "rec-1" }),
    listDnsRecords: vi.fn().mockResolvedValue([]),
    ...over,
  };
}
const kl = (cloudflare: ReturnType<typeof fakeCf>, extra: Record<string, unknown> = {}) =>
  ({ cloudflare, ...extra }) as unknown as LepesKliensek;

async function zonaKesz(id: string, cf: ReturnType<typeof fakeCf>) {
  const t = await Telepites.findById(id).lean();
  cf.getZone.mockImplementation(async () => ({
    id: "zone-1",
    name: t!.domain!,
    status: "active",
    name_servers: [],
  }));
  const r = await deploymentsApi.vegrehajt(id, "cloudflare_zona", SZEREPLO, { kliensek: kl(cf) });
  expect(r.ok).toBe(true);
}

describe("pipeline: dry-run, execute, idempotency", () => {
  it("dry-run mutates nothing and writes exactly one lepes_terv event", async () => {
    const id = await letrehoz();
    const cf = fakeCf();
    const r = await deploymentsApi.vegrehajt(id, "cloudflare_zona", SZEREPLO, {
      kliensek: kl(cf),
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    expect(cf.createZone).not.toHaveBeenCalled();
    expect((await lepes(id, "cloudflare_zona")).allapot).toBe("fuggo");
    expect((await esemenyek(id)).filter((e) => e.tipus === "lepes_terv")).toHaveLength(1);
  });

  it("runs a step: done, external ids stored, status kiepites, start+ok events", async () => {
    const id = await letrehoz();
    const cf = fakeCf();
    const r = await deploymentsApi.vegrehajt(id, "cloudflare_zona", SZEREPLO, { kliensek: kl(cf) });
    expect(r.ok).toBe(true);
    const t = (await Telepites.findById(id).lean())!;
    expect(t.lepesek.find((l) => l.kulcs === "cloudflare_zona")).toMatchObject({
      allapot: "kesz",
      kulsoId: "zone-1",
    });
    expect(t.kulsoIdk.cloudflareZonaId).toBe("zone-1");
    expect(t.allapot).toBe("kiepites");
    expect((await esemenyek(id)).map((e) => e.tipus)).toEqual(["megjegyzes", "lepes_inditas", "lepes_ok"]);
  });

  it("re-running an unchanged finished step only verifies (idempotent)", async () => {
    const id = await letrehoz();
    const cf = fakeCf();
    await zonaKesz(id, cf);
    cf.getZone.mockClear();
    const r = await deploymentsApi.vegrehajt(id, "cloudflare_zona", SZEREPLO, { kliensek: kl(cf) });
    expect(r.ok && r.eredmeny.noop).toBe(true);
    expect(cf.createZone).toHaveBeenCalledTimes(1);
    expect(cf.getZone).toHaveBeenCalled();
  });

  it("a changed intent (domain) allows re-execution; force always does", async () => {
    const id = await letrehoz();
    const cf = fakeCf();
    await zonaKesz(id, cf);
    await deploymentsApi.vegrehajt(id, "cloudflare_zona", SZEREPLO, { kliensek: kl(cf), force: true });
    expect(cf.createZone).toHaveBeenCalledTimes(2);
  });

  it("blocks a step whose dependency is not ready", async () => {
    const id = await letrehoz();
    const r = await deploymentsApi.vegrehajt(id, "dns_rekordok", SZEREPLO, { kliensek: {} });
    expect(r).toMatchObject({ ok: false });
    expect(r.ok === false && r.message).toContain("ns_delegalas");
  });

  it("refuses a second concurrent execution of the same step, reclaims an abandoned one", async () => {
    const id = await letrehoz();
    const cf = fakeCf();
    await Telepites.updateOne(
      { _id: id, "lepesek.kulcs": "cloudflare_zona" },
      { $set: { "lepesek.$.allapot": "fut", "lepesek.$.inditva": new Date() } },
    );
    const r = await deploymentsApi.vegrehajt(id, "cloudflare_zona", SZEREPLO, { kliensek: kl(cf) });
    expect(r).toMatchObject({ ok: false });
    expect(cf.createZone).not.toHaveBeenCalled();
    // The same step abandoned for longer than the threshold may be taken over.
    await Telepites.updateOne(
      { _id: id, "lepesek.kulcs": "cloudflare_zona" },
      {
        $set: {
          "lepesek.$.inditva": new Date(Date.now() - (LEPES_AKADAS_PERCEK + 5) * 60_000),
        },
      },
    );
    const r2 = await deploymentsApi.vegrehajt(id, "cloudflare_zona", SZEREPLO, { kliensek: kl(cf) });
    expect(r2.ok).toBe(true);
    expect(cf.createZone).toHaveBeenCalledTimes(1);
  });
});

describe("pipeline: failure mid-way leaves a resumable state", () => {
  it("keeps finished steps, marks the failed one, status serult; retry resumes from there", async () => {
    const id = await letrehoz();
    const cf = fakeCf({
      upsertDnsRecord: vi.fn().mockRejectedValue(new Error("boom")),
    });
    await zonaKesz(id, cf);
    // NS delegation needs a human, then a verify against an active zone completes it.
    const ns = await deploymentsApi.vegrehajt(id, "ns_delegalas", SZEREPLO, { kliensek: kl(cf) });
    expect(ns.ok && ns.eredmeny).toMatchObject({ allapot: "kezi" });
    expect((await lepes(id, "ns_delegalas")).allapot).toBe("kezi");
    const ell = await deploymentsApi.ellenoriz(id, "ns_delegalas", SZEREPLO, { kliensek: kl(cf) });
    expect(ell.ok).toBe(true);
    expect((await lepes(id, "ns_delegalas")).allapot).toBe("kesz");

    const dns = await deploymentsApi.vegrehajt(id, "dns_rekordok", SZEREPLO, { kliensek: kl(cf) });
    expect(dns.ok).toBe(false);
    const t = (await Telepites.findById(id).lean())!;
    expect(t.lepesek.find((l) => l.kulcs === "dns_rekordok")).toMatchObject({
      allapot: "hibas",
      utolsoHiba: "Ismeretlen hiba történt a lépés végrehajtása közben.",
    });
    // Earlier steps stay finished — nothing is rolled back.
    expect(t.lepesek.find((l) => l.kulcs === "cloudflare_zona")!.allapot).toBe("kesz");
    expect(t.allapot).toBe("serult");
    expect((await esemenyek(id)).some((e) => e.tipus === "lepes_hiba")).toBe(true);

    // Fix the provider, retry only the failed step.
    cf.upsertDnsRecord.mockResolvedValue({ id: "rec-9" });
    const retry = await deploymentsApi.vegrehajt(id, "dns_rekordok", SZEREPLO, { kliensek: kl(cf) });
    expect(retry.ok).toBe(true);
    const t2 = (await Telepites.findById(id).lean())!;
    expect(t2.lepesek.find((l) => l.kulcs === "dns_rekordok")).toMatchObject({
      allapot: "kesz",
      kulsoId: "rec-9",
    });
    expect(cf.createZone).toHaveBeenCalledTimes(1); // the zone was never re-created
    expect(t2.allapot).toBe("kiepites");
  });

  it("kovetkezok() stops at the manual NS step, resumes after it is verified", async () => {
    const id = await letrehoz();
    const cf = fakeCf();
    await zonaKesz(id, cf);
    const r = await deploymentsApi.kovetkezok(id, SZEREPLO, { kliensek: kl(cf) });
    expect(r.ok && r.eredmeny.akadaly).toBe("ns_delegalas");
    expect(r.ok && r.eredmeny.lefutott).toEqual(["ns_delegalas"]);
  });

  it("a provider error shows its safe message, never the raw one", async () => {
    const id = await letrehoz();
    const cf = fakeCf({
      createZone: vi
        .fn()
        .mockRejectedValue(
          new IntegrationError("cloudflare", "ZONE_EXISTS", "A zóna már létezik.", 409),
        ),
    });
    const r = await deploymentsApi.vegrehajt(id, "cloudflare_zona", SZEREPLO, { kliensek: kl(cf) });
    expect(r).toEqual({ ok: false, message: "A zóna már létezik." });
    expect((await lepes(id, "cloudflare_zona")).utolsoHiba).toBe("A zóna már létezik.");
  });
});

describe("skip / adopt / verify", () => {
  it("adopts an existing zone (domain must match)", async () => {
    const id = await letrehoz();
    const t = (await Telepites.findById(id).lean())!;
    const cf = fakeCf({
      getZone: vi.fn().mockResolvedValue({ id: "zone-9", name: t.domain, status: "active", name_servers: [] }),
    });
    const r = await deploymentsApi.adoptal(id, "cloudflare_zona", "zone-9", SZEREPLO, { kliensek: kl(cf) });
    expect(r.ok).toBe(true);
    expect(await lepes(id, "cloudflare_zona")).toMatchObject({ allapot: "adoptalva", kulsoId: "zone-9" });
    expect((await Telepites.findById(id).lean())!.kulsoIdk.cloudflareZonaId).toBe("zone-9");
    expect((await esemenyek(id)).some((e) => e.tipus === "lepes_adopt")).toBe(true);

    const rossz = await letrehoz();
    const cf2 = fakeCf({
      getZone: vi.fn().mockResolvedValue({ id: "z", name: "mas.hu", status: "active", name_servers: [] }),
    });
    const r2 = await deploymentsApi.adoptal(rossz, "cloudflare_zona", "z", SZEREPLO, { kliensek: kl(cf2) });
    expect(r2.ok).toBe(false);
    expect((await lepes(rossz, "cloudflare_zona")).allapot).toBe("fuggo");
  });

  it("skips a skippable step, un-skips it; the last step cannot be skipped", async () => {
    const id = await letrehoz();
    expect((await deploymentsApi.kihagy(id, "image_epites", "van kész image", SZEREPLO)).ok).toBe(true);
    expect((await lepes(id, "image_epites")).allapot).toBe("kihagyva");
    expect((await deploymentsApi.kihagyasVisszavon(id, "image_epites", SZEREPLO)).ok).toBe(true);
    expect((await lepes(id, "image_epites")).allapot).toBe("fuggo");
    const r = await deploymentsApi.kihagy(id, "stack_inditas", undefined, SZEREPLO);
    expect(r.ok).toBe(false);
  });

  it("a running or finished step cannot be skipped", async () => {
    const id = await letrehoz();
    const cf = fakeCf();
    await zonaKesz(id, cf);
    expect((await deploymentsApi.kihagy(id, "cloudflare_zona", undefined, SZEREPLO)).ok).toBe(false);
    expect((await lepes(id, "cloudflare_zona")).allapot).toBe("kesz");
  });

  it("a skipped, unverified dependency blocks dependents unless an admin overrides", async () => {
    const id = await letrehoz();
    for (const k of ["cloudflare_zona", "ns_delegalas", "dns_rekordok", "ssl_tanusitvany"]) {
      await deploymentsApi.kihagy(id, k, undefined, SZEREPLO);
    }
    const npm = {
      getProxyHost: vi.fn(),
    } as unknown as LepesKliensek;
    const nemEngedi = await deploymentsApi.vegrehajt(id, "proxy_host", SZEREPLO, {
      kliensek: npm,
      input: { force_dependency_override: true },
    });
    // A non-privileged actor cannot pass `force_dependency_override`.
    expect(nemEngedi).toMatchObject({ ok: false });
    expect(nemEngedi.ok === false && nemEngedi.message).toContain("ssl_tanusitvany");
    // The admin gets past the dependency gate and fails later on the missing client.
    const admin = await deploymentsApi.vegrehajt(id, "proxy_host", ADMIN, {
      kliensek: {},
      input: { force_dependency_override: true },
    });
    expect(admin.ok === false && admin.message).not.toContain("függő lépés");
  });

  it("verify reports drift without changing a finished step", async () => {
    const id = await letrehoz();
    const cf = fakeCf();
    await zonaKesz(id, cf);
    cf.getZone.mockResolvedValue({ id: "zone-1", name: "masik.hu", status: "active", name_servers: [] });
    const r = await deploymentsApi.ellenoriz(id, "cloudflare_zona", SZEREPLO, { kliensek: kl(cf) });
    expect(r.ok && r.eredmeny).toMatchObject({ ok: false, elteresek: ["zone.name_mismatch"] });
    expect((await lepes(id, "cloudflare_zona")).allapot).toBe("kesz");
  });

  it("an imported deployment adopts the steps whose external id exists and goes live when complete", async () => {
    const id = await letrehoz();
    await Telepites.deleteMany({});
    const r = await deploymentsApi.createTelepites(BEMENET(), "u", {
      forras: "importalt",
      kulsoIdk: {
        cloudflareZonaId: "z",
        cloudflareDnsRekordIdk: ["r"],
        npmTanusitvanyId: 1,
        npmProxyHostId: 2,
        portainerStackId: 3,
      },
    });
    expect(r.ok).toBe(true);
    const t = (await Telepites.findById(r.ok && r.id).lean())!;
    const allapotok = Object.fromEntries(t.lepesek.map((l) => [l.kulcs, l.allapot]));
    expect(allapotok.cloudflare_zona).toBe("adoptalva");
    expect(allapotok.ns_delegalas).toBe("fuggo");
    expect(id).toBeTruthy();
  });
});

describe("stack render: secret placeholders", () => {
  it("passes the decrypted secret to Portainer but never stores or logs it", async () => {
    const sablon = await deploymentsApi.createSablon(
      {
        nev: "Alap",
        composeYaml:
          "services:\n  app:\n    image: {{ IMAGE }}:{{ IMAGE_TAG }}\n    environment:\n      DB: {{ DB_PASSWORD }}\nnetworks:\n  nginxproxy_default:\n    external: true\n",
        helyorzok: [{ kulcs: "DB_PASSWORD", cimke: "DB jelszó", kotelezo: true, titkos: true }],
      },
      "u",
    );
    expect(sablon.ok).toBe(true);
    const id = await letrehoz({
      stack: {
        nev: "partner-x",
        sablonId: sablon.ok ? sablon.id : undefined,
        env: [{ nev: "DB_PASSWORD", ertek: "ENV-SECRET-VALUE", titkos: true }],
      },
    });
    for (const k of ["cloudflare_zona", "ns_delegalas", "dns_rekordok", "ssl_tanusitvany", "proxy_host", "image_epites"]) {
      await Telepites.updateOne(
        { _id: id, "lepesek.kulcs": k },
        { $set: { "lepesek.$.allapot": "kesz", "lepesek.$.kulsoId": "1" } },
      );
    }
    const portainer = {
      createStackStandalone: vi.fn().mockResolvedValue({ id: 7, webhookId: "wh" }),
      updateStack: vi.fn(),
    };
    const r = await deploymentsApi.vegrehajt(id, "stack_letrehozas", SZEREPLO, {
      kliensek: { portainer } as unknown as LepesKliensek,
    });
    expect(r.ok).toBe(true);
    const [, compose, env] = portainer.createStackStandalone.mock.calls[0]!;
    expect(compose).toContain("DB: ENV-SECRET-VALUE");
    expect(env).toEqual([{ name: "DB_PASSWORD", value: "ENV-SECRET-VALUE" }]);

    // Nothing in the database or the DTOs contains the plaintext.
    const raw = JSON.stringify([
      await Telepites.find().lean(),
      await TelepitesEsemeny.find().lean(),
    ]);
    expect(raw).not.toContain("ENV-SECRET-VALUE");
    const detail = await deploymentsApi.getTelepites(id);
    expect(JSON.stringify(detail)).not.toContain("ENV-SECRET-VALUE");
    expect(detail!.stack.env).toEqual([{ nev: "DB_PASSWORD", ertek: undefined, titkos: true, vanErtek: true }]);
    // The template preview masks secrets too.
    const el = await deploymentsApi.elonezet(sablon.ok ? sablon.id! : "", { DB_PASSWORD: "x-secret" });
    expect(el!.compose).toContain("DB: ***");
    expect(el!.compose).not.toContain("x-secret");
  });

  it("an update with a blank secret keeps the stored one", async () => {
    const id = await letrehoz({
      stack: { nev: "p", env: [{ nev: "S", ertek: "regi-titok", titkos: true }] },
    });
    const elotte = (await Telepites.findById(id).lean())!.stack.env[0]!.titkosErtek;
    const t = (await Telepites.findById(id).lean())!;
    const r = await deploymentsApi.updateTelepites(id, {
      nev: "Uj nev",
      domain: t.domain!,
      stack: { nev: "p", env: [{ nev: "S", titkos: true }] },
    });
    expect(r.ok).toBe(true);
    expect((await Telepites.findById(id).lean())!.stack.env[0]!.titkosErtek).toBe(elotte);
  });
});

describe("IntegracioKapcsolat: credentials are never returned", () => {
  const TITOK = "SUPER-SECRET-CF-TOKEN-123";

  it("list/get expose field names only; the database holds ciphertext", async () => {
    const r = await deploymentsApi.createIntegracio(
      {
        szolgaltato: "cloudflare",
        cimke: "Fo fiok",
        alapUrl: "https://api.cloudflare.com/client/v4",
        hitelesito: { api_token: TITOK },
      },
      "u",
    );
    expect(r.ok).toBe(true);
    const lista = await deploymentsApi.listIntegraciok({ page: 1, pageSize: 25, filters: {} });
    const reszlet = await deploymentsApi.getIntegracio(r.ok ? r.id! : "");
    for (const kimenet of [lista, reszlet]) {
      const s = JSON.stringify(kimenet);
      expect(s).not.toContain(TITOK);
      expect(s).not.toContain("hitelesitoTitkositott");
      expect(s).not.toMatch(/[0-9a-f]{24}:[0-9a-f]{32}:/); // no iv:tag:ciphertext payload either
    }
    expect(lista.data[0]!.hitelesitoMezok).toEqual(["api_token"]);
    const raw = await IntegracioKapcsolat.findOne().lean();
    expect(raw!.hitelesitoTitkositott).not.toContain(TITOK);
    expect(raw!.hitelesitoTitkositott.split(":")).toHaveLength(3);
  });

  it("requires the provider's credential fields; an update with blank fields keeps the secret", async () => {
    const rossz = await deploymentsApi.createIntegracio(
      { szolgaltato: "npm", cimke: "n", alapUrl: "https://npm.example", hitelesito: { email: "a@b.hu" } },
      "u",
    );
    expect(rossz.ok).toBe(false);
    const r = await deploymentsApi.createIntegracio(
      { szolgaltato: "cloudflare", cimke: "c", alapUrl: "https://cf.example", hitelesito: { api_token: TITOK } },
      "u",
    );
    const id = r.ok ? r.id! : "";
    await deploymentsApi.updateIntegracio(id, {
      szolgaltato: "cloudflare",
      cimke: "c2",
      alapUrl: "https://cf.example",
      hitelesito: { api_token: "" },
    });
    let seen = "";
    await deploymentsApi.tesztIntegracio(id, (k) => {
      seen = k.hitelesito.api_token!;
      return { verifyToken: async () => ({ ok: true }) } as never;
    });
    expect(seen).toBe(TITOK);
  });

  it("the test button stores the outcome and returns only a message", async () => {
    const r = await deploymentsApi.createIntegracio(
      { szolgaltato: "cloudflare", cimke: "c", alapUrl: "https://cf.example", hitelesito: { api_token: TITOK } },
      "u",
    );
    const id = r.ok ? r.id! : "";
    const ok = await deploymentsApi.tesztIntegracio(id, () => ({ verifyToken: async () => ({ ok: true }) }) as never);
    expect(ok).toMatchObject({ ok: true, sikeres: true });
    expect((await IntegracioKapcsolat.findById(id).lean())!.utolsoEllenorzesOk).toBe(true);

    const hibas = await deploymentsApi.tesztIntegracio(id, () =>
      ({
        verifyToken: async () => {
          throw new IntegrationError("cloudflare", "HTTP_401", "cloudflare kérés sikertelen (HTTP 401)", 401);
        },
      }) as never,
    );
    expect(hibas).toMatchObject({ ok: true, sikeres: false });
    expect(JSON.stringify(hibas)).not.toContain(TITOK);
    expect((await IntegracioKapcsolat.findById(id).lean())!.utolsoEllenorzesOk).toBe(false);
  });

  it("credentials do not leak into events even when a provider error carries them", async () => {
    const id = await letrehoz();
    const cf = fakeCf({
      createZone: vi.fn().mockRejectedValue(new Error(`Authorization: Bearer ${TITOK}`)),
    });
    await deploymentsApi.vegrehajt(id, "cloudflare_zona", SZEREPLO, { kliensek: kl(cf) });
    const osszes = JSON.stringify([
      await TelepitesEsemeny.find().lean(),
      await Telepites.find().lean(),
      await deploymentsApi.listEsemenyek(id),
      await deploymentsApi.getTelepites(id),
    ]);
    expect(osszes).not.toContain(TITOK);
  });

  it("event details are redacted before they are stored", async () => {
    const id = await letrehoz();
    await esemenyNaploz({
      telepitesId: id,
      tipus: "megjegyzes",
      szereplo: SZEREPLO,
      uzenet: "x",
      reszlet: { api_token: TITOK, ok: 1, nested: { password: "pw" } },
    });
    const e = (await TelepitesEsemeny.findOne({ uzenet: "x" }).lean())!;
    expect(JSON.stringify(e.reszlet)).not.toContain(TITOK);
    expect(JSON.stringify(e.reszlet)).not.toContain("pw");
    expect(e.reszlet).toMatchObject({ api_token: "***", ok: 1 });
  });
});

describe("billing", () => {
  const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

  async function elo(opts: { ar?: number; csomagAr?: number } = {}) {
    const cs = await deploymentsApi.createCsomag({
      kod: `s-${Math.random().toString(36).slice(2, 7)}`,
      nev: "Small",
      arHuf: opts.csomagAr ?? 1000,
      alapCiklus: "havi",
    });
    const id = await letrehoz();
    await deploymentsApi.beallitSzamlazas(
      id,
      { csomagId: cs.ok ? cs.id : null, arFelulirasHuf: opts.ar ?? null },
      d("2026-01-01"),
    );
    await Telepites.updateOne({ _id: id }, { $set: { allapot: "elo" } });
    return id;
  }

  it("rolls periods idempotently and advances the billing date", async () => {
    const id = await elo();
    const most = d("2026-03-15");
    const a = await deploymentsApi.idoszakokGeneral(most);
    expect(a.letrehozva).toBe(3); // Jan, Feb, Mar
    const b = await deploymentsApi.idoszakokGeneral(most);
    expect(b.letrehozva).toBe(0);
    const t = (await Telepites.findById(id).lean())!;
    expect(t.kovetkezoSzamlazas!.toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(await Fizetes.countDocuments({ telepitesId: id })).toBe(3);
  });

  it("parallel runs never create a period twice", async () => {
    const id = await elo();
    const most = d("2026-02-10");
    await Promise.all([
      deploymentsApi.idoszakokGeneral(most),
      deploymentsApi.idoszakokGeneral(most),
      deploymentsApi.idoszakokGeneral(most),
    ]);
    expect(await Fizetes.countDocuments({ telepitesId: id })).toBe(2);
  });

  it("uses the price override over the package price", async () => {
    const id = await elo({ ar: 500, csomagAr: 1000 });
    await deploymentsApi.idoszakokGeneral(d("2026-01-10"));
    expect((await Fizetes.findOne({ telepitesId: id }).lean())!.osszegHuf).toBe(500);
  });

  it("does not bill drafts, archived or suspended deployments", async () => {
    const id = await elo();
    await Telepites.updateOne({ _id: id }, { $set: { allapot: "felfuggesztve" } });
    expect((await deploymentsApi.idoszakokGeneral(d("2026-03-15"))).letrehozva).toBe(0);
  });

  it("overdue is computed lazily: the stored state stays esedekes", async () => {
    await elo();
    await deploymentsApi.idoszakokGeneral(d("2026-01-10"));
    const sor = (await Fizetes.findOne().lean())!;
    expect(sor.allapot).toBe("esedekes");
    const q = { page: 1, pageSize: 25, filters: {} };
    const korai = await deploymentsApi.listFizetesek(q, { most: d("2026-01-20") });
    expect(korai.data[0]!.allapot).toBe("esedekes");
    const kesobb = await deploymentsApi.listFizetesek(q, { most: d("2026-03-01") });
    expect(kesobb.data[0]!.allapot).toBe("keso");
    // The board filter works on the computed state too.
    const csakKeso = await deploymentsApi.listFizetesek(
      { ...q, filters: { allapot: "keso" } },
      { most: d("2026-03-01") },
    );
    expect(csakKeso.total).toBe(1);
    const csakEsedekes = await deploymentsApi.listFizetesek(
      { ...q, filters: { allapot: "esedekes" } },
      { most: d("2026-03-01") },
    );
    expect(csakEsedekes.total).toBe(0);
    expect((await deploymentsApi.osszegzes(d("2026-03-01"))).keso).toBe(1);
  });

  it("mark-paid sets last-paid once; a second attempt and a waive after paying fail", async () => {
    const id = await elo();
    await deploymentsApi.idoszakokGeneral(d("2026-01-10"));
    const sor = (await Fizetes.findOne().lean())!;
    const r = await deploymentsApi.fizetveJelol(String(sor._id), {}, "u", d("2026-01-12"));
    expect(r.ok).toBe(true);
    expect((await Telepites.findById(id).lean())!.utolsoFizetes!.toISOString()).toContain("2026-01-12");
    expect((await deploymentsApi.fizetveJelol(String(sor._id), {}, "u")).ok).toBe(false);
    expect((await deploymentsApi.elenged(String(sor._id), "ok", "u")).ok).toBe(false);
  });

  it("paying an old period late never moves last-paid backwards", async () => {
    const id = await elo();
    await deploymentsApi.idoszakokGeneral(d("2026-02-10"));
    const [jan, feb] = await Fizetes.find().sort({ idoszakKezdet: 1 }).lean();
    await deploymentsApi.fizetveJelol(String(feb!._id), {}, "u", d("2026-02-20"));
    await deploymentsApi.fizetveJelol(String(jan!._id), {}, "u", d("2026-02-25"));
    // Latest payment date wins (25th is later than 20th) — and is never replaced by an earlier one.
    expect((await Telepites.findById(id).lean())!.utolsoFizetes!.toISOString()).toContain("2026-02-25");
  });

  it("archiving cancels future unstarted periods and leaves overdue ones", async () => {
    const id = await elo();
    await deploymentsApi.idoszakokGeneral(d("2026-01-10"));
    await Fizetes.create({
      telepitesId: id,
      idoszakKezdet: new Date(Date.now() + 40 * 86_400_000),
      idoszakVeg: new Date(Date.now() + 70 * 86_400_000),
      osszegHuf: 1,
      ciklus: "havi",
    });
    expect((await deploymentsApi.archival(id, "megszunt", "u")).ok).toBe(true);
    const sorok = await Fizetes.find({ telepitesId: id }).sort({ idoszakKezdet: 1 }).lean();
    expect(sorok.map((s) => s.allapot)).toEqual(["esedekes", "torolve"]);
  });
});

describe("partner portal scoping", () => {
  const portal = (o: Partial<Extract<Nezo, { kind: "portal" }>> = {}): Nezo => ({
    kind: "portal",
    partnerId: "p1",
    portalUserId: "pu1",
    partnerAdmin: false,
    ...o,
  });

  async function seed() {
    const a = await letrehoz({ partnerId: "p1" });
    const b = await letrehoz({ partnerId: "p1" });
    const masik = await letrehoz({ partnerId: "p2" });
    return { a, b, masik };
  }

  it("a plain portal user sees only what it was granted, never another partner's", async () => {
    const { a, b, masik } = await seed();
    expect(await deploymentsApi.listPortalTelepitesek(portal())).toEqual([]);
    await deploymentsApi.setHozzaferes({ portalFelhasznaloId: "pu1", telepitesId: a }, "u");
    // A grant on a deployment of another partner binds to *that* partner — it does not leak across.
    await deploymentsApi.setHozzaferes({ portalFelhasznaloId: "pu1", telepitesId: masik }, "u");
    const lista = await deploymentsApi.listPortalTelepitesek(portal());
    expect(lista.map((x) => x.id)).toEqual([a]);
    expect(lista.map((x) => x.id)).not.toContain(b);
    expect(lista.map((x) => x.id)).not.toContain(masik);
  });

  it("a partner admin sees all of its partner's deployments, not archived ones", async () => {
    const { a, b, masik } = await seed();
    await deploymentsApi.archival(b, "x", "u");
    const lista = await deploymentsApi.listPortalTelepitesek(portal({ partnerAdmin: true }));
    expect(lista.map((x) => x.id)).toEqual([a]);
    expect(lista.map((x) => x.id)).not.toContain(masik);
  });

  it("portal rows are the allow-listed projection only", async () => {
    const { a } = await seed();
    await deploymentsApi.setHozzaferes({ portalFelhasznaloId: "pu1", telepitesId: a }, "u");
    const [sor] = await deploymentsApi.listPortalTelepitesek(portal());
    expect(Object.keys(sor!).sort()).toEqual(
      ["allapot", "arHuf", "azonosito", "ciklus", "csomagNev", "domain", "id", "nev", "utolsoFizetes"].sort(),
    );
  });

  it("access checks: view needs a grant, manage needs `kezel`, outsiders are denied", async () => {
    const { a, masik } = await seed();
    expect(await deploymentsApi.portalHozzaferes(a, portal())).toBe(false);
    await deploymentsApi.setHozzaferes({ portalFelhasznaloId: "pu1", telepitesId: a }, "u");
    expect(await deploymentsApi.portalHozzaferes(a, portal())).toBe(true);
    expect(await deploymentsApi.portalHozzaferes(a, portal(), "kezel")).toBe(false);
    await deploymentsApi.setHozzaferes({ portalFelhasznaloId: "pu1", telepitesId: a, szint: "kezel" }, "u");
    expect(await deploymentsApi.portalHozzaferes(a, portal(), "kezel")).toBe(true);
    expect(await deploymentsApi.portalHozzaferes(masik, portal({ partnerAdmin: true }))).toBe(false);
    expect(await deploymentsApi.portalHozzaferes(a, portal({ partnerId: "" }))).toBe(false);
  });

  it("portal payments: only the visible deployments, allow-listed fields", async () => {
    const { a, masik } = await seed();
    await Fizetes.create({ telepitesId: a, idoszakKezdet: new Date("2026-01-01"), idoszakVeg: new Date("2026-01-31"), osszegHuf: 5, ciklus: "havi" });
    await Fizetes.create({ telepitesId: masik, idoszakKezdet: new Date("2026-01-01"), idoszakVeg: new Date("2026-01-31"), osszegHuf: 9, ciklus: "havi" });
    expect(await deploymentsApi.listPortalFizetesek(portal())).toEqual([]);
    await deploymentsApi.setHozzaferes({ portalFelhasznaloId: "pu1", telepitesId: a }, "u");
    const sorok = await deploymentsApi.listPortalFizetesek(portal(), new Date("2026-06-01"));
    expect(sorok).toHaveLength(1);
    expect(sorok[0]).toMatchObject({ osszegHuf: 5, allapot: "keso" });
    expect(sorok[0]).not.toHaveProperty("telepitesId");
    expect(sorok[0]).not.toHaveProperty("szamlaId");
  });

  it("a grant needs a deployment with a partner", async () => {
    const id = await letrehoz();
    expect((await deploymentsApi.setHozzaferes({ portalFelhasznaloId: "pu1", telepitesId: id }, "u")).ok).toBe(false);
  });
});

describe("registry records, lifecycle, Teendőim", () => {
  it("a registry-only record (absorbed DomainHosting) holds expiries and has no pipeline", async () => {
    const r = await deploymentsApi.createNyilvantartas(
      {
        nev: "Regi domainek",
        partnerId: "p1",
        lejaratok: [{ tipus: "domain", cimke: "regi.hu", lejarat: "2026-12-01" }],
      },
      "u",
    );
    expect(r.ok).toBe(true);
    const t = (await Telepites.findById(r.ok && r.id).lean())!;
    expect(t).toMatchObject({ allapot: "nyilvantartas", forras: "nyilvantartas", lepesek: [] });
    const add = await deploymentsApi.addLejarat(r.ok ? r.id! : "", { tipus: "ssl", cimke: "ssl", lejarat: "2027-01-01" });
    expect(add.ok).toBe(true);
    expect((await deploymentsApi.getTelepites(r.ok ? r.id! : ""))!.lejaratok).toHaveLength(2);
    // Registry-only records cannot run steps.
    const futt = await deploymentsApi.vegrehajt(r.ok ? r.id! : "", "cloudflare_zona", SZEREPLO, {});
    expect(futt.ok).toBe(false);
    // Two registry records without a domain do not collide on the unique domain index.
    expect((await deploymentsApi.createNyilvantartas({ nev: "Masik" }, "u")).ok).toBe(true);
  });

  it("a duplicate domain is rejected", async () => {
    const b = BEMENET();
    expect((await deploymentsApi.createTelepites(b, "u")).ok).toBe(true);
    const dup = await deploymentsApi.createTelepites({ ...BEMENET(), domain: b.domain }, "u");
    expect(dup).toMatchObject({ ok: false });
  });

  it("delete only works for an untouched deployment; archive needs a reason and is reversible", async () => {
    const tiszta = await letrehoz();
    expect((await deploymentsApi.deleteTelepites(tiszta)).ok).toBe(true);
    const id = await letrehoz();
    await zonaKesz(id, fakeCf());
    expect((await deploymentsApi.deleteTelepites(id)).ok).toBe(false);
    expect((await deploymentsApi.archival(id, "  ", "u")).ok).toBe(false);
    expect((await deploymentsApi.archival(id, "megszunt", "u")).ok).toBe(true);
    expect((await deploymentsApi.vegrehajt(id, "ns_delegalas", SZEREPLO, { kliensek: {} })).ok).toBe(false);
    expect((await deploymentsApi.visszaallit(id)).ok).toBe(true);
    expect((await Telepites.findById(id).lean())!.allapot).toBe("kiepites");
  });

  it("Teendőim: failed / manual steps, overdue payments and expiring records, gated by what the viewer may see", async () => {
    const id = await letrehoz();
    const cf = fakeCf();
    await zonaKesz(id, cf);
    await deploymentsApi.vegrehajt(id, "ns_delegalas", SZEREPLO, { kliensek: kl(cf) }); // kezi
    await Fizetes.create({ telepitesId: id, idoszakKezdet: new Date("2020-01-01"), idoszakVeg: new Date("2020-01-31"), osszegHuf: 100, ciklus: "havi" });
    await deploymentsApi.createNyilvantartas(
      { nev: "R", lejaratok: [{ tipus: "domain", cimke: "lejaro.hu", lejarat: new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10) }] },
      "u",
    );
    const mind = await deploymentsApi.listTeendok({ telepites: true, fizetes: true });
    expect(mind.map((t) => t.entityType).sort()).toEqual(["fizetes", "telepites-lejarat", "telepites-lepes"]);
    expect(mind.every((t) => t.module === "deployments")).toBe(true);
    const csakFizetes = await deploymentsApi.listTeendok({ telepites: false, fizetes: true });
    expect(csakFizetes.map((t) => t.entityType)).toEqual(["fizetes"]);
    expect(await deploymentsApi.listTeendok({ telepites: false, fizetes: false })).toEqual([]);
  });

  it("the shared folyamat view reflects the pipeline", async () => {
    const id = await letrehoz();
    const cf = fakeCf({ createZone: vi.fn().mockRejectedValue(new Error("x")) });
    await deploymentsApi.vegrehajt(id, "cloudflare_zona", SZEREPLO, { kliensek: kl(cf) });
    const n = (await deploymentsApi.getFolyamatNezet(id))!;
    expect(n.lepesek[0]!.allapot).toBe("elutasitva");
    expect(n.aktualis?.nev).toBe("Cloudflare zóna");
  });
});
