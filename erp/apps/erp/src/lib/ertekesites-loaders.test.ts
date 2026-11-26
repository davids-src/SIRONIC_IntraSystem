import { describe, expect, it } from "vitest";
import type { PartnerDetail } from "@erp/partner";
import { arlistaProfil } from "./ertekesites-loaders";

const partner = (o: Partial<PartnerDetail>) => o as PartnerDetail;

describe("arlistaProfil", () => {
  it("a partner szókincsét az árlista szókincsére képezi", () => {
    expect(
      arlistaProfil(
        partner({
          partnerSzerep: "alvallalkozo_megbizo",
          ugyfelKategoria: "magansemely",
          arazasiSzerzodesTipus: "6_honap",
          alvallalkozoJelenletTipus: "napi",
        }),
      ),
    ).toEqual({
      szerep: "alvallalkozo_megbizo",
      ugyfelKategoria: "maganszemely",
      szerzodesTipus: "6_honapos",
      alvallalkozoiJelenlet: "napi_jelenlet",
    });
  });

  it("hiányzó profil null értékekre esik vissza", () => {
    expect(arlistaProfil(partner({}))).toEqual({
      szerep: null,
      ugyfelKategoria: null,
      szerzodesTipus: null,
      alvallalkozoiJelenlet: null,
    });
  });
});
