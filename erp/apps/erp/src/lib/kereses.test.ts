// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { SearchHit } from "@erp/core";
import { partnerApi } from "@erp/partner";
import { arlistaApi } from "@erp/arlista";
import { keszletApi } from "@erp/keszlet";
import { ertekesitesApi } from "@erp/ertekesites";
import { szervizApi } from "@erp/szerviz";
import { bizonylatApi } from "@erp/bizonylat";
import { projektApi } from "@erp/projekt";
import { eszkozApi } from "@erp/eszkoz";
import { deploymentsApi } from "@erp/deployments";
import { secretsApi } from "@erp/secrets";
import { globalisKereses } from "./kereses";

const hit = (modul: string): SearchHit => ({
  module: modul,
  entityLabel: "X",
  entityId: "1",
  title: "T",
  url: "/x",
});
const viewer = { userId: "u1", permissions: [] as string[] };

describe("globalisKereses", () => {
  it("két karakternél rövidebb kifejezésre nem keres", async () => {
    const k = vi.fn(async () => [hit("a")]);
    expect(await globalisKereses("a", viewer, [{ modul: "a", kereses: k }])).toEqual([]);
    expect(k).not.toHaveBeenCalled();
  });

  it("csoportosít, az üres és a hibás modult kihagyja", async () => {
    const r = await globalisKereses("acme", viewer, [
      { modul: "partner", kereses: async () => [hit("partner")] },
      { modul: "keszlet", kereses: async () => [] },
      {
        modul: "szerviz",
        kereses: async () => {
          throw new Error("boom");
        },
      },
    ]);
    expect(r.map((c) => c.modul)).toEqual(["partner"]);
    expect(r[0]?.cimke).toBe("Partner");
  });
});

describe("modul facade search — jogosultság-kapu", () => {
  const apis = {
    partner: partnerApi,
    arlista: arlistaApi,
    keszlet: keszletApi,
    ertekesites: ertekesitesApi,
    szerviz: szervizApi,
    bizonylat: bizonylatApi,
    projekt: projektApi,
    eszkoz: eszkozApi,
    deployments: deploymentsApi,
    secrets: secretsApi,
  };
  for (const [nev, api] of Object.entries(apis)) {
    it(`${nev}: olvasási jog nélkül nem ad találatot (DB nélkül)`, async () => {
      expect(await api.search("teszt", { userId: "u1", permissions: [] })).toEqual([]);
    });
    it(`${nev}: rövid kifejezésre üres`, async () => {
      expect(await api.search("a", { userId: "u1", permissions: ["*"] })).toEqual([]);
    });
  }
});
