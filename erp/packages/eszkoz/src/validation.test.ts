import { describe, expect, it } from "vitest";
import { eszkozSchema, kiadasSchema, visszavetelSchema } from "./validation";
import {
  ESZKOZ_ALLAPOTOK,
  ESZKOZ_ALLAPOT_LABELS,
  MOZGAS_TIPUSOK,
  MOZGAS_TIPUS_LABELS,
} from "./constants";

describe("eszkozSchema", () => {
  it("requires a megnevezés and trims", () => {
    expect(
      eszkozSchema.safeParse({ megnevezes: "  ", fizikaiAllapot: "uj" }).success,
    ).toBe(false);
    const r = eszkozSchema.parse({
      megnevezes: " Fúró ",
      marka: "",
      fizikaiAllapot: "jo",
    });
    expect(r.megnevezes).toBe("Fúró");
    expect(r.marka).toBeUndefined();
  });
  it("rejects an unknown physical state", () => {
    expect(
      eszkozSchema.safeParse({ megnevezes: "X", fizikaiAllapot: "torott" }).success,
    ).toBe(false);
  });
});

describe("kiadas / visszavetel", () => {
  it("needs a recipient", () => {
    expect(kiadasSchema.safeParse({ celUserId: "" }).success).toBe(false);
    expect(kiadasSchema.safeParse({ celUserId: "abc" }).success).toBe(true);
  });
  it("needs the returned condition", () => {
    expect(visszavetelSchema.safeParse({}).success).toBe(false);
    expect(visszavetelSchema.safeParse({ fizikaiAllapot: "rossz" }).success).toBe(true);
  });
});

describe("labels", () => {
  it("cover every key", () => {
    for (const k of ESZKOZ_ALLAPOTOK) expect(ESZKOZ_ALLAPOT_LABELS[k]).toBeTruthy();
    for (const k of MOZGAS_TIPUSOK) expect(MOZGAS_TIPUS_LABELS[k]).toBeTruthy();
  });
});
