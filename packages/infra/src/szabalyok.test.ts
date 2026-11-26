import { describe, expect, it } from "vitest";
import {
  composeElemez,
  envSzovegbol,
  hostnevHibas,
  imageRovid,
  lejaratNapok,
  normalizeHost,
  stackAllapot,
  stackTipusTipp,
  tanusitvanyLefedi,
  tanusitvanyValaszt,
  zonaKeres,
} from "./szabalyok";

const MOST = new Date("2026-11-22T00:00:00Z");

describe("hostnevek és zónák", () => {
  it("normalizál és validál", () => {
    expect(normalizeHost("  WWW.Pelda.HU. ")).toBe("www.pelda.hu");
    expect(hostnevHibas("pelda.hu")).toBeNull();
    expect(hostnevHibas("api.sakkmed.hu")).toBeNull();
    expect(hostnevHibas("nincs-tld")).not.toBeNull();
    expect(hostnevHibas("rossz host.hu")).not.toBeNull();
  });
  it("a leghosszabb illeszkedő zónát választja", () => {
    const zonak = [{ name: "hu" }, { name: "sakkmed.hu" }, { name: "src.co.hu" }];
    expect(zonaKeres("api.sakkmed.hu", zonak)?.name).toBe("sakkmed.hu");
    expect(zonaKeres("sakkmed.hu", zonak)?.name).toBe("sakkmed.hu");
    expect(zonaKeres("crm.src.co.hu", zonak)?.name).toBe("src.co.hu");
    expect(zonaKeres("masikdomain.com", zonak)).toBeNull();
    expect(zonaKeres("xsakkmed.hu", [{ name: "sakkmed.hu" }])).toBeNull();
  });
});

describe("tanúsítványok", () => {
  const cert = (id: number, nevek: string[], lejar: string) => ({
    id,
    domain_names: nevek,
    expires_on: lejar,
  });
  it("a wildcard csak egy szintet fed le", () => {
    const c = cert(1, ["*.src.co.hu"], "2027-01-01 00:00:00");
    expect(tanusitvanyLefedi(c, ["crm.src.co.hu"], MOST)).toBe(true);
    expect(tanusitvanyLefedi(c, ["a.b.src.co.hu"], MOST)).toBe(false);
    expect(tanusitvanyLefedi(c, ["src.co.hu"], MOST)).toBe(false);
  });
  it("lejárt tanúsítványt nem használ újra", () => {
    const c = cert(1, ["pelda.hu"], "2026-11-01 00:00:00");
    expect(tanusitvanyLefedi(c, ["pelda.hu"], MOST)).toBe(false);
  });
  it("a legszűkebb, legtovább érvényes tanúsítványt választja", () => {
    const nagy = cert(1, ["a.hu", "b.hu", "c.hu"], "2027-06-01 00:00:00");
    const kicsi = cert(2, ["a.hu", "www.a.hu"], "2027-02-01 00:00:00");
    expect(tanusitvanyValaszt([nagy, kicsi], ["a.hu", "www.a.hu"], MOST)?.id).toBe(2);
    expect(tanusitvanyValaszt([nagy], ["x.hu"], MOST)).toBeNull();
  });
  it("lejárati napokat számol", () => {
    expect(lejaratNapok("2026-12-02 00:00:00", MOST)).toBe(10);
    expect(lejaratNapok(null, MOST)).toBeNull();
  });
});

describe("compose", () => {
  it("kiolvassa a szolgáltatásokat és image-eket", () => {
    const r = composeElemez(
      "services:\n  web:\n    image: ghcr.io/x/web:main\n    container_name: web_c\n    ports: ['8080:3000']\n  api:\n    image: ghcr.io/x/api:latest\n",
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.szolgaltatasok.map((s) => s.nev)).toEqual(["web", "api"]);
      expect(r.szolgaltatasok[0]?.containerName).toBe("web_c");
    }
  });
  it("elutasítja a hibás bemenetet", () => {
    expect(composeElemez("").ok).toBe(false);
    expect(composeElemez("services: [").ok).toBe(false);
    expect(composeElemez("version: '3'").ok).toBe(false);
    expect(composeElemez("services:\n  a:\n    restart: always\n").ok).toBe(false);
  });
  it("env szövegből sorokat készít", () => {
    expect(envSzovegbol("A=1\n# komment\nB=x=y\n\nC")).toEqual([
      { name: "A", value: "1" },
      { name: "B", value: "x=y" },
      { name: "C", value: "" },
    ]);
  });
  it("rövidíti az image nevet", () => {
    expect(imageRovid("ghcr.io/tomkoooo/tdarts:main")).toBe("tomkoooo/tdarts:main");
    expect(imageRovid("mariadb:11")).toBe("mariadb:11");
  });
});

describe("stack állapot", () => {
  it("a konténerekből vezeti le", () => {
    const k = (state: string) => ({ nev: "x", state });
    expect(stackAllapot([k("running"), k("running")])).toBe("fut");
    expect(stackAllapot([k("running"), k("exited")])).toBe("reszben");
    expect(stackAllapot([k("exited")])).toBe("leallitva");
    expect(stackAllapot([k("running"), k("restarting")])).toBe("hibas");
    expect(stackAllapot([])).toBe("ures");
    expect(stackAllapot([k("running")], true)).toBe("elveszett");
  });
  it("a rendszer-stackeket felismeri", () => {
    expect(stackTipusTipp("nginxproxy")).toBe("rendszer");
    expect(stackTipusTipp("sakkmed")).toBe("projekt");
  });
});
