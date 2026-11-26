import { describe, expect, it } from "vitest";
import {
  ERDEKLODO_ALLAPOTOK,
  ERDEKLODO_ALLAPOT_LABELS,
  ERDEKLODO_ALLAPOT_TONES,
  PARTNER_SZEREPEK,
  PARTNER_SZEREP_LABELS,
} from "./constants";
import { archivalasSchema, erdeklodoSchema, partnerSchema } from "./validation";
import { partnerPermissions } from "./permissions";

describe("constants", () => {
  it("every status has a label and a tone", () => {
    for (const k of ERDEKLODO_ALLAPOTOK) {
      expect(ERDEKLODO_ALLAPOT_LABELS[k]).toBeTruthy();
      expect(ERDEKLODO_ALLAPOT_TONES[k]).toBeTruthy();
    }
    for (const k of PARTNER_SZEREPEK) expect(PARTNER_SZEREP_LABELS[k]).toBeTruthy();
  });
});

describe("partnerSchema", () => {
  it("requires type and name", () => {
    expect(partnerSchema.safeParse({ nev: "X" }).success).toBe(false);
    expect(partnerSchema.safeParse({ tipus: "ceg", nev: "" }).success).toBe(false);
  });

  it("applies defaults and drops empty optional values", () => {
    const r = partnerSchema.parse({
      tipus: "ceg",
      nev: " Acme Kft. ",
      adoszam: "",
      email: "",
    });
    expect(r.nev).toBe("Acme Kft.");
    expect(r.adoszam).toBeUndefined();
    expect(r.kapcsolattartok).toEqual([]);
    expect(r.megujitasEmlekeztetoNap).toBe(30);
  });

  it("rejects an invalid e-mail and an unknown role", () => {
    expect(
      partnerSchema.safeParse({ tipus: "ceg", nev: "A", email: "nem-email" }).success,
    ).toBe(false);
    expect(
      partnerSchema.safeParse({ tipus: "ceg", nev: "A", partnerSzerep: "kiraly" })
        .success,
    ).toBe(false);
  });

  it("rejects a contract ending before it starts", () => {
    const r = partnerSchema.safeParse({
      tipus: "ceg",
      nev: "A",
      szerzodesKezdete: "2026-05-01",
      szerzodesVege: "2026-04-01",
    });
    expect(r.success).toBe(false);
  });

  it("collapses an all-empty address to undefined", () => {
    const r = partnerSchema.parse({ tipus: "ceg", nev: "A", szekhely: { varos: "" } });
    expect(r.szekhely).toBeUndefined();
  });
});

describe("erdeklodoSchema / archivalasSchema", () => {
  it("parses a decimal-comma value", () => {
    expect(
      erdeklodoSchema.parse({ cegNev: "A", becsultErtek: "1200,5" }).becsultErtek,
    ).toBe(1200.5);
  });
  it("requires an archive reason", () => {
    expect(archivalasSchema.safeParse({ ok: " " }).success).toBe(false);
  });
});

describe("partnerPermissions", () => {
  it("registers the six documented keys", () => {
    expect(partnerPermissions.permissions.map((p) => p.key).sort()).toEqual([
      "partner:erdeklodo:delete",
      "partner:erdeklodo:read",
      "partner:erdeklodo:write",
      "partner:partner:delete",
      "partner:partner:read",
      "partner:partner:write",
    ]);
  });
});
