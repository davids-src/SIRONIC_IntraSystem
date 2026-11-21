import { describe, expect, it } from "vitest";
import { LEPES_KULCSOK, type LepesAllapot, type LepesKulcs } from "./constants";
import {
  LEPES_DEFINICIOK,
  idempotenciaKulcs,
  levezetTelepitesAllapot,
  type TelepitesSzandek,
} from "./szabalyok";

const lepesek = (m: Partial<Record<LepesKulcs, LepesAllapot>>) =>
  LEPES_KULCSOK.map((kulcs) => ({ kulcs, allapot: m[kulcs] ?? ("fuggo" as const) }));

describe("levezetTelepitesAllapot", () => {
  it("is piszkozat when nothing has started", () => {
    expect(levezetTelepitesAllapot("piszkozat", lepesek({}))).toBe("piszkozat");
  });
  it("is kiepites once a step runs or needs a human", () => {
    expect(levezetTelepitesAllapot("piszkozat", lepesek({ cloudflare_zona: "fut" }))).toBe(
      "kiepites",
    );
    expect(levezetTelepitesAllapot("piszkozat", lepesek({ ns_delegalas: "kezi" }))).toBe(
      "kiepites",
    );
  });
  it("is serult when a step failed after others succeeded", () => {
    expect(
      levezetTelepitesAllapot(
        "kiepites",
        lepesek({ cloudflare_zona: "kesz", ns_delegalas: "hibas" }),
      ),
    ).toBe("serult");
  });
  it("a first-step failure alone is still kiepites, not serult", () => {
    expect(levezetTelepitesAllapot("piszkozat", lepesek({ cloudflare_zona: "hibas" }))).toBe(
      "kiepites",
    );
  });
  it("is elo when every required step is done/adopted/skipped", () => {
    expect(
      levezetTelepitesAllapot(
        "kiepites",
        lepesek({
          cloudflare_zona: "kesz",
          ns_delegalas: "kesz",
          dns_rekordok: "kesz",
          ssl_tanusitvany: "kihagyva",
          proxy_host: "kesz",
          image_epites: "kihagyva",
          stack_letrehozas: "adoptalva",
          stack_inditas: "kesz",
        }),
      ),
    ).toBe("elo");
  });
  it("stack_inditas cannot be skipped to reach elo", () => {
    expect(LEPES_DEFINICIOK.stack_inditas.kihagyhato).toBe(false);
    const mind = Object.fromEntries(
      LEPES_KULCSOK.map((k) => [k, "kesz" as const]),
    ) as Record<LepesKulcs, LepesAllapot>;
    expect(levezetTelepitesAllapot("kiepites", lepesek({ ...mind, stack_inditas: "kihagyva" }))).not.toBe(
      "elo",
    );
  });
  it("keeps archivalt / felfuggesztve / registry-only", () => {
    expect(levezetTelepitesAllapot("archivalt", lepesek({}))).toBe("archivalt");
    expect(levezetTelepitesAllapot("felfuggesztve", lepesek({ cloudflare_zona: "kesz" }))).toBe(
      "felfuggesztve",
    );
    expect(levezetTelepitesAllapot("nyilvantartas", [])).toBe("nyilvantartas");
  });
});

describe("dependency graph", () => {
  it("matches docs/deployments/04 §4", () => {
    expect(LEPES_DEFINICIOK.stack_letrehozas.fuggosegek).toEqual(["proxy_host", "image_epites"]);
    expect(LEPES_DEFINICIOK.cloudflare_zona.fuggosegek).toEqual([]);
    expect(LEPES_DEFINICIOK.dns_rekordok.fuggosegek).toEqual(["ns_delegalas"]);
  });
});

const alap: TelepitesSzandek = {
  domain: "example.com",
  wwwAtiranyitas: true,
  dns: { rekordTipus: "A", cel: "1.2.3.4" },
  proxy: { celHost: "app", celPort: 3000 },
  image: { repo: "ghcr.io/x/y", tag: "abc" },
  stack: { nev: "partner-example" },
};

describe("idempotenciaKulcs", () => {
  it("is stable for an unchanged intent", () => {
    expect(idempotenciaKulcs("d1", "dns_rekordok", alap)).toBe(
      idempotenciaKulcs("d1", "dns_rekordok", { ...alap }),
    );
  });
  it("changes with the step's own intent", () => {
    expect(idempotenciaKulcs("d1", "dns_rekordok", alap)).not.toBe(
      idempotenciaKulcs("d1", "dns_rekordok", { ...alap, dns: { rekordTipus: "A", cel: "5.6.7.8" } }),
    );
  });
  it("ignores fields outside the step's intent and differs per step / deployment", () => {
    expect(idempotenciaKulcs("d1", "dns_rekordok", alap)).toBe(
      idempotenciaKulcs("d1", "dns_rekordok", { ...alap, proxy: { celHost: "other", celPort: 1 } }),
    );
    expect(idempotenciaKulcs("d1", "dns_rekordok", alap)).not.toBe(
      idempotenciaKulcs("d1", "ssl_tanusitvany", alap),
    );
    expect(idempotenciaKulcs("d1", "dns_rekordok", alap)).not.toBe(
      idempotenciaKulcs("d2", "dns_rekordok", alap),
    );
  });
});
