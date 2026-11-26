// @vitest-environment node
import { describe, expect, it, vi, type Mock } from "vitest";
import {
  ajanlatElfogadvaFigyelo,
  igazolasElfogadvaFigyelo,
  keszletAlacsonyFigyelo,
  type FigyeloFuggosegek,
} from "./esemeny-figyelok";

type Mocks = {
  [K in keyof FigyeloFuggosegek]: FigyeloFuggosegek[K] extends (...a: never[]) => unknown
    ? Mock<FigyeloFuggosegek[K]>
    : FigyeloFuggosegek[K];
};

function fuggosegek(o: Partial<FigyeloFuggosegek> = {}): Mocks {
  const d = {
    felhasznalokJoggal: vi.fn(async () => [{ id: "u1", nev: "Pénzügy Pál" }]),
    ertesit: vi.fn(async () => {}),
    feladatLetrehoz: vi.fn(async () => ({ id: "f1" })),
    igazolas: vi.fn(async () => ({
      partnerId: "p1",
      cim: "Igazolás",
      penznem: "HUF",
      sorok: [
        {
          leiras: "Munka",
          mennyiseg: 2,
          egyseg: "óra",
          nettoEgysegar: 9000,
          afaKulcs: 27,
        },
      ],
    })),
    partner: vi.fn(async () => ({ partnerNev: "Acme Kft." })),
    szamlaLetrehoz: vi.fn(async () => ({ ok: true as const, id: "sz1" })),
    most: () => new Date("2026-11-21T10:00:00Z"),
    ...o,
  };
  return d as unknown as Mocks;
}

const ajanlat = {
  ajanlatId: "aj1",
  azonosito: "AJ-000001",
  partnerId: "p1",
  partnerNev: "Acme Kft.",
  nettoOsszeg: 100,
  bruttoOsszeg: 127,
  penznem: "HUF",
  elfogadtaUserId: "owner1",
};
const igazolas = {
  igazolasId: "ig1",
  azonosito: "TI-000001",
  partnerId: "p1",
  partnerNev: "Acme Kft.",
  nettoOsszeg: 18000,
  bruttoOsszeg: 22860,
  penznem: "HUF",
  alairoNev: "Kiss Béla",
};

describe("ajanlat.elfogadva", () => {
  it("kapcsolt feladatot ad a tulajdonosnak és értesíti", async () => {
    const d = fuggosegek();
    await ajanlatElfogadvaFigyelo(d)(ajanlat);
    expect(d.feladatLetrehoz).toHaveBeenCalledOnce();
    const i = (d.feladatLetrehoz.mock.calls[0] as unknown[])[0] as Record<
      string,
      unknown
    >;
    expect(i).toMatchObject({
      felelosId: "owner1",
      hatarido: "2026-11-28",
      kapcsolat: { modul: "ertekesites", tipus: "ajanlat", id: "aj1" },
    });
    expect(d.ertesit).toHaveBeenCalledWith(["owner1"], expect.anything());
  });

  it("hiba esetén sem dob", async () => {
    const d = fuggosegek({
      feladatLetrehoz: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    await expect(ajanlatElfogadvaFigyelo(d)(ajanlat)).resolves.toBeUndefined();
  });
});

describe("teljesitesigazolas.elfogadva", () => {
  it("számlapiszkozatot készít az igazolás soraiból és értesít", async () => {
    const d = fuggosegek();
    await igazolasElfogadvaFigyelo(d)(igazolas);
    expect(d.szamlaLetrehoz).toHaveBeenCalledOnce();
    const [input, , szereplo] = d.szamlaLetrehoz.mock.calls[0] as unknown as [
      { igazolasId: string; sorok: unknown[] },
      unknown,
      { id: string },
    ];
    expect(input.igazolasId).toBe("ig1");
    expect(input.sorok).toHaveLength(1);
    expect(szereplo.id).toBe("u1");
    expect(d.ertesit).toHaveBeenCalledWith(
      ["u1"],
      expect.objectContaining({ url: "/bizonylat/szamlak/sz1" }),
    );
  });

  it("nincs piszkozat számlát kezelő felhasználó nélkül, és nem dob", async () => {
    const d = fuggosegek({ felhasznalokJoggal: vi.fn(async () => []) });
    await expect(igazolasElfogadvaFigyelo(d)(igazolas)).resolves.toBeUndefined();
    expect(d.szamlaLetrehoz).not.toHaveBeenCalled();
  });
});

describe("keszlet.alacsony", () => {
  const p = {
    tetelId: "t1",
    arlistaTermekId: "a1",
    nev: "IP kamera",
    kod: "K-1",
    raktarhelyKod: "",
    keszlet: 2,
    minimum: 5,
  };
  it("jelzést küld a készletkezelőknek", async () => {
    const d = fuggosegek();
    await keszletAlacsonyFigyelo(d)(p);
    expect(d.felhasznalokJoggal).toHaveBeenCalledWith("keszlet:keszlet:write");
    expect(d.ertesit).toHaveBeenCalledWith(
      ["u1"],
      expect.objectContaining({ url: "/keszlet/lista/t1" }),
    );
  });
  it("kezelő nélkül nem küld semmit", async () => {
    const d = fuggosegek({ felhasznalokJoggal: vi.fn(async () => []) });
    await keszletAlacsonyFigyelo(d)(p);
    expect(d.ertesit).not.toHaveBeenCalled();
  });
});
