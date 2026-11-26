import { describe, expect, it } from "vitest";
import {
  folyamatHaladas,
  folyamatKovetkezo,
  folyamatLepesEsemeny,
  type FolyamatMotorLepes,
} from "./folyamat";

const lepes = (
  allapot: FolyamatMotorLepes["allapot"],
  feladatId?: string,
): FolyamatMotorLepes => ({
  allapot,
  feladatId,
});

describe("folyamat-motor", () => {
  it("closing the running step finishes it; a stale task is ignored", () => {
    const l = lepes("aktiv", "f1");
    expect(folyamatLepesEsemeny(l, { tipus: "lezarva", feladatId: "f0" })).toBeNull();
    expect(l.allapot).toBe("aktiv");
    const most = new Date("2026-11-20T10:00:00Z");
    expect(
      folyamatLepesEsemeny(
        l,
        { tipus: "lezarva", feladatId: "f1", megjegyzes: "ok" },
        most,
      ),
    ).toBe("kesz");
    expect(l).toMatchObject({ allapot: "kesz", befejezve: most, megjegyzes: "ok" });
    // Closing again (already done) changes nothing.
    expect(folyamatLepesEsemeny(l, { tipus: "lezarva", feladatId: "f1" })).toBeNull();
  });

  it("refuse → elutasitva, withdraw → megszakitva, handover → aktiv with the new task", () => {
    const a = lepes("aktiv", "f1");
    expect(
      folyamatLepesEsemeny(a, {
        tipus: "elutasitva",
        feladatId: "f1",
        megjegyzes: "nem",
      }),
    ).toBe("elutasitva");
    expect(a.allapot).toBe("elutasitva");
    expect(
      folyamatLepesEsemeny(a, {
        tipus: "ujrakiadva",
        feladatId: "f1",
        ujFelelosId: "u2",
      }),
    ).toBe("atadva");
    expect(a.allapot).toBe("aktiv");
    expect(
      folyamatLepesEsemeny(a, {
        tipus: "tovabbadva",
        feladatId: "f1",
        ujFelelosId: "u3",
        ujFeladatId: "f2",
      }),
    ).toBe("atadva");
    expect(a.feladatId).toBe("f2");
    expect(folyamatLepesEsemeny(a, { tipus: "tovabbadva", feladatId: "f2" })).toBeNull();
    expect(folyamatLepesEsemeny(a, { tipus: "visszavonva", feladatId: "f2" })).toBe(
      "megszakitva",
    );
    expect(a.allapot).toBe("megszakitva");
  });

  it("next step: start the planned one, wait on a stopped one, done when all done", () => {
    expect(folyamatKovetkezo([lepes("kesz"), lepes("tervezett")], 0)).toEqual({
      tipus: "indit",
      index: 1,
    });
    expect(
      folyamatKovetkezo([lepes("kesz"), lepes("kesz"), lepes("tervezett")], 0),
    ).toEqual({
      tipus: "indit",
      index: 2,
    });
    expect(folyamatKovetkezo([lepes("kesz"), lepes("megszakitva")], 0)).toEqual({
      tipus: "var",
    });
    expect(folyamatKovetkezo([lepes("kesz"), lepes("kesz")], 1)).toEqual({
      tipus: "kesz",
    });
    expect(folyamatKovetkezo([lepes("elutasitva"), lepes("kesz")], 1)).toEqual({
      tipus: "var",
    });
  });

  it("progress ignores skipped steps", () => {
    expect(
      folyamatHaladas([
        { allapot: "kesz" },
        { allapot: "kihagyva" },
        { allapot: "aktiv" },
        { allapot: "tervezett" },
      ]),
    ).toEqual({ kesz: 1, osszes: 3, szazalek: 33, aktualis: 2 });
    expect(folyamatHaladas([])).toEqual({
      kesz: 0,
      osszes: 0,
      szazalek: 0,
      aktualis: -1,
    });
  });
});
