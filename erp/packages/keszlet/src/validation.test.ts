import { describe, expect, it } from "vitest";
import { ervenyes } from "./engine";
import { RMA_ATMENETEK, szuloKod } from "./constants";
import { bevetelSchema, foglalasSchema, raktarhelySchema } from "./validation";

describe("ervenyes (0 <= foglalt <= keszlet after the change)", () => {
  it("accepts valid and rejects over-issue / over-reservation / negative release", () => {
    expect(ervenyes(5, 2, -3, 0)).toBe(true);
    expect(ervenyes(5, 2, -4, 0)).toBe(false);
    expect(ervenyes(5, 2, 0, 3)).toBe(true);
    expect(ervenyes(5, 2, 0, 4)).toBe(false);
    expect(ervenyes(5, 2, 0, -3)).toBe(false);
    expect(ervenyes(5, 2, -2, -2)).toBe(true);
  });
});

describe("raktárhely kód", () => {
  it("derives the parent and validates the pattern", () => {
    expect(szuloKod("FO/A/12")).toBe("FO/A");
    expect(szuloKod("FO")).toBeUndefined();
    const ok = { nev: "x", tipus: "polc" as const };
    expect(raktarhelySchema.safeParse({ ...ok, kod: "FO/A-1" }).success).toBe(true);
    expect(raktarhelySchema.safeParse({ ...ok, kod: "FO//A" }).success).toBe(false);
    expect(raktarhelySchema.safeParse({ ...ok, kod: "a b" }).success).toBe(false);
  });
});

describe("schemas", () => {
  it("requires positive quantities", () => {
    expect(foglalasSchema.safeParse({ mennyiseg: "0", kulcs: "k" }).success).toBe(false);
    expect(foglalasSchema.safeParse({ mennyiseg: "2", kulcs: "k" }).success).toBe(true);
    expect(bevetelSchema.safeParse({ sorok: [] }).success).toBe(false);
  });
});

describe("RMA transitions", () => {
  it("terminal states have no way out", () => {
    expect(RMA_ATMENETEK.selejtezve).toEqual([]);
    expect(RMA_ATMENETEK.visszaadva_ugyfelnek).toEqual([]);
    expect(RMA_ATMENETEK.beerkezett).toContain("beszallitonak_kuldve");
  });
});
