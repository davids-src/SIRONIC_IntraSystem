import { describe, expect, it } from "vitest";
import {
  mapCsomag,
  mapEsemeny,
  mapFizetes,
  mapHozzaferes,
  mapIntegracio,
  mapTelepites,
  migraljDeployments,
  type LegacyDeployment,
  type MigraltKontextus,
} from "./deployments";

const ctx: MigraltKontextus = {
  partnerIds: new Map([["c1", "P1"]]),
  userIds: new Map([["u1", "N1"]]),
  telepitesIds: new Map([["d1", "T1"]]),
  csomagIds: new Map([["pk1", "CS1"]]),
  portalUserIds: new Map([["pu1", "PU1"]]),
};

const legacy: LegacyDeployment = {
  _id: "d1",
  contact_id: "c1",
  deployment_number: "DEP-0001",
  name: " Példa ",
  domain: "Pelda.HU",
  status: "provisioning",
  billing_cycle: "quarterly",
  package_id: "pk1",
  source: "imported",
  created_by: "u1",
  stack: { env: [{ name: "A", value: "1" }] },
  steps: [
    { key: "cloudflare_zone", status: "done", external_id: "z1" },
    { key: "stack_deploy", status: "manual_required" },
    { key: "ssl_certificate", status: "adopted" },
  ],
  external_ids: { cloudflare_zone_id: "z1", npm_proxy_host_id: 7 },
};

describe("mapTelepites", () => {
  const t = mapTelepites(legacy, ctx);

  it("renames fields, drops tenantId and resolves ids", () => {
    expect(t).toMatchObject({
      azonosito: "DEP-0001",
      nev: "Példa",
      domain: "pelda.hu",
      allapot: "kiepites",
      forras: "importalt",
      partnerId: "P1",
      csomagId: "CS1",
      szamlazasiCiklus: "negyedeves",
      letrehozoId: "N1",
    });
    expect(t).not.toHaveProperty("tenantId");
    expect(t.kulsoIdk).toMatchObject({ cloudflareZonaId: "z1", npmProxyHostId: 7 });
  });

  it("maps step keys and states", () => {
    expect(t.lepesek.map((l) => [l.kulcs, l.allapot])).toEqual([
      ["cloudflare_zona", "kesz"],
      ["stack_inditas", "kezi"],
      ["ssl_tanusitvany", "adoptalva"],
    ]);
    expect(t.lepesek[0]!.kulsoId).toBe("z1");
  });

  it("keeps legacy env values as non-secret entries", () => {
    expect(t.stack.env).toEqual([{ nev: "A", ertek: "1", titkos: false }]);
  });

  it("leaves unknown partners unresolved instead of guessing", () => {
    expect(
      mapTelepites({ ...legacy, contact_id: "nincs" }, ctx).partnerId,
    ).toBeUndefined();
  });
});

describe("mapIntegracio", () => {
  it("carries the ciphertext verbatim", () => {
    const r = mapIntegracio(
      {
        provider: "npm",
        label: "NPM",
        base_url: "https://npm.local",
        encrypted_credentials: "iv:tag:ct",
        created_by: "u1",
      },
      ctx,
    );
    expect(r.hitelesitoTitkositott).toBe("iv:tag:ct");
    expect(r.szolgaltato).toBe("npm");
    expect(r.letrehozoId).toBe("N1");
  });
});

describe("mapCsomag", () => {
  it("maps cycle and resources", () => {
    expect(
      mapCsomag({
        code: "s",
        name: "S",
        price_huf: 5000,
        default_cycle: "yearly",
        resources: { ram_mb: 512 },
      }),
    ).toMatchObject({ kod: "s", alapCiklus: "eves", eroforrasok: { ramMb: 512 } });
  });
});

describe("mapFizetes", () => {
  const alap = {
    deployment_id: "d1",
    period_start: "2026-01-01",
    period_end: "2026-02-01",
    amount_huf: 1000,
    cycle: "monthly",
  };

  it("stores legacy overdue as esedekes (computed lazily now)", () => {
    expect(mapFizetes({ ...alap, status: "overdue" }, ctx)?.allapot).toBe("esedekes");
    expect(mapFizetes({ ...alap, status: "paid" }, ctx)?.allapot).toBe("fizetve");
    expect(mapFizetes({ ...alap, status: "waived" }, ctx)?.allapot).toBe("elengedve");
    expect(mapFizetes({ ...alap, status: "cancelled" }, ctx)?.allapot).toBe("torolve");
  });

  it("skips rows whose deployment was not migrated", () => {
    expect(mapFizetes({ ...alap, deployment_id: "x", status: "due" }, ctx)).toBeNull();
  });
});

describe("mapEsemeny", () => {
  it("maps kind, actor and step key", () => {
    const e = mapEsemeny(
      {
        deployment_id: "d1",
        step_key: "dns_records",
        kind: "step_execute_fail",
        actor_type: "crm_user",
        actor_id: "u1",
        message: "hiba",
      },
      ctx,
    );
    expect(e).toMatchObject({
      telepitesId: "T1",
      lepesKulcs: "dns_rekordok",
      tipus: "lepes_hiba",
      szereploTipus: "munkatars",
      szereploId: "N1",
    });
  });

  it("returns null for events of unknown deployments", () => {
    expect(
      mapEsemeny(
        { deployment_id: "x", kind: "note", actor_type: "system", message: "m" },
        ctx,
      ),
    ).toBeNull();
  });
});

describe("mapHozzaferes", () => {
  it("maps the access level and needs every id to resolve", () => {
    const l = {
      contact_id: "c1",
      portal_user_id: "pu1",
      deployment_id: "d1",
      access_level: "manage",
    };
    expect(mapHozzaferes(l, ctx)).toMatchObject({ szint: "kezel", telepitesId: "T1" });
    expect(mapHozzaferes({ ...l, portal_user_id: "?" }, ctx)).toBeNull();
  });
});

describe("migraljDeployments (D12 absorption)", () => {
  it("attaches a DomainHosting record to the partner's only deployment", () => {
    const r = migraljDeployments(
      {
        telepitesek: [legacy],
        domainHostingok: [
          {
            _id: "h1",
            contact_id: "c1",
            record_type: "domain",
            label: "pelda.hu",
            expiry_date: "2027-01-01",
          },
        ],
      },
      ctx,
    );
    expect(r.telepitesek[0]!.lejaratok).toHaveLength(1);
    expect(r.telepitesek[0]!.lejaratok[0]).toMatchObject({
      tipus: "domain",
      cimke: "pelda.hu",
    });
    expect(r.nyilvantartasok).toHaveLength(0);
  });

  it("emits a registry-only record when the partner has no single deployment", () => {
    const r = migraljDeployments(
      {
        telepitesek: [],
        domainHostingok: [
          { _id: "h1", contact_id: "c1", record_type: "hosting", label: "VPS" },
        ],
      },
      ctx,
    );
    expect(r.nyilvantartasok[0]).toMatchObject({
      forras: "nyilvantartas",
      partnerId: "P1",
      migraltDomainHostingId: "h1",
    });
  });

  it("warns about records of unknown partners", () => {
    const r = migraljDeployments(
      {
        telepitesek: [],
        domainHostingok: [{ _id: "h2", contact_id: "?", record_type: "ssl", label: "x" }],
      },
      ctx,
    );
    expect(r.figyelmeztetesek).toHaveLength(1);
    expect(r.nyilvantartasok).toHaveLength(0);
  });
});
