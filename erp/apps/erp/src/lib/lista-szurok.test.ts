import { describe, expect, it } from "vitest";
import { parseDataTableQuery } from "@erp/ui";
import { ertekOpciok, napTartomany, szuroErtekek, vagyMind } from "./lista-szurok";

describe("lista-szurok", () => {
  it("reads single and repeated select values", () => {
    const q = parseDataTableQuery(
      new URLSearchParams(
        "f.gepRendszam=ABC-1&f.gepRendszam=XYZ-2&f.gepeszNev=Kiss%20P%C3%A9ter",
      ),
    );
    expect(szuroErtekek(q, "gepRendszam")).toEqual(["ABC-1", "XYZ-2"]);
    expect(szuroErtekek(q, "gepeszNev")).toEqual(["Kiss Péter"]);
    expect(szuroErtekek(q, "nincs")).toEqual([]);
  });

  it("reads the same values from a Server Component searchParams record", () => {
    const q = parseDataTableQuery({
      "f.nev": ["A", "B"],
      "f.nap": ["2026-11-01", "2026-11-30"],
    });
    expect(szuroErtekek(q, "nev")).toEqual(["A", "B"]);
    expect(napTartomany(q, "nap")).toEqual({ tol: "2026-11-01", ig: "2026-11-30" });
  });

  it("keeps an open-ended range and drops malformed days", () => {
    expect(
      napTartomany(
        parseDataTableQuery(new URLSearchParams("f.nap=&f.nap=2026-11-30")),
        "nap",
      ),
    ).toEqual({ tol: undefined, ig: "2026-11-30" });
    expect(
      napTartomany(parseDataTableQuery(new URLSearchParams("f.nap=2026-11-01")), "nap"),
    ).toEqual({ tol: "2026-11-01", ig: undefined });
    expect(
      napTartomany(
        parseDataTableQuery(new URLSearchParams("f.nap=tegnap&f.nap=x")),
        "nap",
      ),
    ).toEqual({ tol: undefined, ig: undefined });
  });

  it("builds distinct, Hungarian-sorted select options", () => {
    expect(ertekOpciok(["Zoli", undefined, "Ádám", "Zoli", "", null])).toEqual([
      { value: "Ádám", label: "Ádám" },
      { value: "Zoli", label: "Zoli" },
    ]);
  });

  it('turns an empty selection into "no filter"', () => {
    expect(vagyMind([])).toBeUndefined();
    expect(vagyMind(["a"])).toEqual(["a"]);
  });
});
