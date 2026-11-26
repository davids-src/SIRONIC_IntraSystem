import { describe, expect, it } from "vitest";
import {
  aktivEmlites,
  beszurEmlites,
  emlitettek,
  idezet,
  uzenetSzegmensek,
} from "./uzenet";

const r = [
  { id: "a", nev: "Kiss Anna" },
  { id: "am", nev: "Kiss Anna Mária" },
  { id: "b", nev: "Nagy Béla" },
];

describe("uzenetSzegmensek", () => {
  it("finds mentions by full name, longest first, ignoring case", () => {
    expect(uzenetSzegmensek("Szia @kiss anna mária, nézd meg!", r)).toEqual([
      { tipus: "szoveg", szoveg: "Szia " },
      { tipus: "emlites", szoveg: "@kiss anna mária", userId: "am" },
      { tipus: "szoveg", szoveg: ", nézd meg!" },
    ]);
    expect(emlitettek("@Nagy Béla és @Kiss Anna, meg újra @Nagy Béla", r)).toEqual([
      "b",
      "a",
    ]);
  });

  it("needs a word boundary on both sides", () => {
    expect(emlitettek("@Kiss Annabella", r)).toEqual([]);
    expect(emlitettek("levél: anna@Kiss Anna", r)).toEqual([]);
    expect(emlitettek("valaki@example.com", r)).toEqual([]);
    expect(uzenetSzegmensek("@ senki", r)).toEqual([
      { tipus: "szoveg", szoveg: "@ senki" },
    ]);
  });

  it("keeps plain text whole", () => {
    expect(uzenetSzegmensek("nincs említés", r)).toEqual([
      { tipus: "szoveg", szoveg: "nincs említés" },
    ]);
    expect(uzenetSzegmensek("", r)).toEqual([]);
  });
});

describe("mention picker helpers", () => {
  it("detects the token being typed", () => {
    expect(aktivEmlites("Szia @Ki", 8)).toEqual({ kezdet: 5, keres: "Ki" });
    expect(aktivEmlites("Szia @Kiss A", 12)).toEqual({ kezdet: 5, keres: "Kiss A" });
    expect(aktivEmlites("@", 1)).toEqual({ kezdet: 0, keres: "" });
    expect(aktivEmlites("mail@x", 6)).toBeNull();
    expect(aktivEmlites("nincs", 5)).toBeNull();
    expect(aktivEmlites("@a\nb", 4)).toBeNull();
  });

  it("inserts the full name and moves the caret after it", () => {
    expect(beszurEmlites("Szia @Ki mi újság", 8, 5, "Kiss Anna")).toEqual({
      szoveg: "Szia @Kiss Anna  mi újság",
      kurzor: 16,
    });
  });

  it("quotes one line, shortened", () => {
    expect(idezet("egy\nkét   három")).toBe("egy két három");
    expect(idezet("x".repeat(100), 10)).toBe(`${"x".repeat(9)}…`);
  });
});
