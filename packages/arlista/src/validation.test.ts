import { describe, expect, it } from "vitest";
import { arlistaPermissions } from "./permissions";
import {
  arazasiBeallitasSchema,
  archivalasSchema,
  createTermekSchema,
  szolgaltatasSchema,
} from "./validation";
import { ALAP_ARAZASI_BEALLITASOK } from "./constants";

describe("validáció", () => {
  it("termék: kötelező mezők magyar üzenettel", () => {
    const r = createTermekSchema.safeParse({
      nev: "",
      kategoria: "",
      egyseg: "",
      nettoAr: -1,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message);
      expect(msgs).toContain("A név megadása kötelező");
      expect(msgs).toContain("Nem lehet negatív");
    }
  });

  it("termék: a kódelőtag nagybetűsre alakul, rossz alak elutasítva", () => {
    const ok = createTermekSchema.safeParse({
      nev: "Kábel",
      kategoria: "Hálózat",
      egyseg: "m",
      nettoAr: 100,
      kodElotag: "hw",
    });
    expect(ok.success && ok.data.kodElotag).toBe("HW");
    const rossz = createTermekSchema.safeParse({
      nev: "x",
      kategoria: "k",
      egyseg: "db",
      nettoAr: 1,
      kodElotag: "1X",
    });
    expect(rossz.success).toBe(false);
  });

  it("archiválás: ok kötelező", () => {
    expect(archivalasSchema.safeParse({ ok: " " }).success).toBe(false);
    expect(archivalasSchema.safeParse({ ok: "Kivezetett termék" }).success).toBe(true);
  });

  it("szolgáltatás: az árazási típus szerinti kötelező mezők", () => {
    const alap = { kategoriaId: "a", nev: "Teszt", egyseg: "óra" };
    const ok = (extra: Record<string, unknown>) =>
      szolgaltatasSchema.safeParse({ ...alap, ...extra }).success;
    expect(ok({ arazasiTipus: "fix" })).toBe(false);
    expect(ok({ arazasiTipus: "fix", belsoAlapar: 100 })).toBe(true);
    expect(ok({ arazasiTipus: "oradij" })).toBe(false);
    expect(ok({ arazasiTipus: "oradij", oradijKategoria: "tanacsadas" })).toBe(true);
    expect(ok({ arazasiTipus: "egysegalapu" })).toBe(false);
    expect(ok({ arazasiTipus: "egyedi" })).toBe(true);
  });

  it("beállítások: az alapértelmezés érvényes", () => {
    expect(arazasiBeallitasSchema.safeParse(ALAP_ARAZASI_BEALLITASOK).success).toBe(true);
  });
});

describe("jogosultságok", () => {
  const kulcsok = arlistaPermissions.permissions.map((p) => p.key);
  it("a titkos beszerzés nincs a sablonokban", () => {
    for (const t of arlistaPermissions.roleTemplates ?? []) {
      expect(t.permissionKeys).not.toContain("arlista:beszerzes:read");
      expect(t.permissionKeys).not.toContain("arlista:beszerzes:write");
    }
  });
  it("minden sablon-kulcs létezik", () => {
    for (const t of arlistaPermissions.roleTemplates ?? []) {
      for (const k of t.permissionKeys) expect(kulcsok).toContain(k);
    }
  });
  it("a kért kulcsok megvannak", () => {
    for (const k of [
      "arlista:termek:read",
      "arlista:termek:write",
      "arlista:szolgaltatas:read",
      "arlista:szolgaltatas:write",
      "arlista:beallitas:write",
      "arlista:beszerzes:read",
    ]) {
      expect(kulcsok).toContain(k);
    }
  });
});
