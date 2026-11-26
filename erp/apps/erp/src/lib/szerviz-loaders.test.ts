import { describe, expect, it, vi } from "vitest";

const { preflight, kiad } = vi.hoisted(() => ({ preflight: vi.fn(), kiad: vi.fn() }));
vi.mock("@erp/keszlet", () => ({ keszletApi: { preflight, kiad } }));
vi.mock("./ertekesites-loaders", () => ({}));

import { keszletKiadasPort } from "./szerviz-loaders";

const terv = [
  { sorIndex: 3, arlistaTermekId: "T1", mennyiseg: 2, nev: "Kamera", egyseg: "db" },
  { sorIndex: 5, arlistaTermekId: "T2", mennyiseg: 1, nev: "Kábel", egyseg: "m" },
];

describe("keszletKiadasPort", () => {
  it("a preflight a motor sorindexét a munkalap sorindexére képezi vissza", async () => {
    preflight.mockResolvedValue({
      osszesElegendo: false,
      sorok: [
        { lineIndex: 0, arlistaTermekId: "T1", kert: 2, szabad: 2, elegendo: true },
        { lineIndex: 1, arlistaTermekId: "T2", kert: 1, szabad: 0, elegendo: false },
      ],
    });
    const r = await keszletKiadasPort("u1").preflight(terv);
    expect(preflight).toHaveBeenCalledWith([
      { arlistaTermekId: "T1", mennyiseg: 2 },
      { arlistaTermekId: "T2", mennyiseg: 1 },
    ]);
    expect(r.osszesElegendo).toBe(false);
    expect(r.sorok.map((s) => s.sorIndex)).toEqual([3, 5]);
    expect(r.sorok[1]?.nev).toBe("Kábel");
  });

  it("a kiadás munkalap hivatkozással és a felhasználóval megy a készletmotorhoz", async () => {
    kiad.mockResolvedValue({ ok: false, message: "Elfogyott" });
    const r = await keszletKiadasPort("u1").kiad(terv, {
      tipus: "munkalap",
      id: "W1",
      azonosito: "ML-1",
    });
    expect(kiad).toHaveBeenCalledWith(
      expect.any(Array),
      { referenceType: "munkalap", referenceId: "W1" },
      "u1",
    );
    expect(r).toEqual({ ok: false, message: "Elfogyott" });
  });
});
