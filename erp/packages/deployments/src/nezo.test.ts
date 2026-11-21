import { describe, expect, it } from "vitest";
import type { Nezo } from "./constants";
import { PORTAL_TELEPITES_MEZOK, szukit, telepitesNezoSzuro } from "./nezo";

const staff: Nezo = { kind: "staff", userId: "u1" };
const portal = (o: Partial<Extract<Nezo, { kind: "portal" }>> = {}): Nezo => ({
  kind: "portal",
  partnerId: "p1",
  portalUserId: "pu1",
  partnerAdmin: false,
  ...o,
});

describe("telepitesNezoSzuro", () => {
  it("staff is unrestricted", () => {
    expect(telepitesNezoSzuro(staff)).toEqual({});
  });

  it("a portal viewer without partner matches nothing", () => {
    expect(telepitesNezoSzuro(portal({ partnerId: "" }), ["a"])).toEqual({
      _id: { $in: [] },
    });
  });

  it("a plain portal user sees only granted deployments of its own partner, never archived/registry", () => {
    expect(telepitesNezoSzuro(portal(), ["a", "b"])).toEqual({
      partnerId: "p1",
      allapot: { $nin: ["archivalt", "nyilvantartas"] },
      _id: { $in: ["a", "b"] },
    });
  });

  it("without any grant a plain portal user sees nothing", () => {
    expect(telepitesNezoSzuro(portal(), [])).toMatchObject({ _id: { $in: [] } });
  });

  it("a partner admin sees all deployments of the partner, regardless of grants", () => {
    const f = telepitesNezoSzuro(portal({ partnerAdmin: true }), ["x"]);
    expect(f).toEqual({
      partnerId: "p1",
      allapot: { $nin: ["archivalt", "nyilvantartas"] },
    });
    expect(f).not.toHaveProperty("_id");
  });
});

describe("portal projection", () => {
  it("is an allow-list: internal fields are dropped", () => {
    const sor = {
      id: "1",
      azonosito: "DEP-000001",
      nev: "n",
      domain: "a.hu",
      allapot: "elo",
      csomagNev: "S",
      arHuf: 1000,
      ciklus: "havi",
      utolsoFizetes: undefined,
      lepesek: [{}],
      kulsoIdk: { cloudflareZonaId: "z" },
      megjegyzes: "belso",
    };
    const ki = szukit(sor, PORTAL_TELEPITES_MEZOK);
    expect(Object.keys(ki).sort()).toEqual([...PORTAL_TELEPITES_MEZOK].sort());
    expect(ki).not.toHaveProperty("lepesek");
    expect(ki).not.toHaveProperty("kulsoIdk");
    expect(ki).not.toHaveProperty("megjegyzes");
  });
});
