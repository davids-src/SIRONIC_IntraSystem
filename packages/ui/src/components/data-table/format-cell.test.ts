import { describe, expect, it } from "vitest";
import { formatDateCell } from "./format-cell";

describe("formatDateCell", () => {
  it("never prints the GMT form", () => {
    for (const v of [
      new Date("2026-11-26T13:30:00Z"),
      "2026-11-26T13:30:00.000Z",
      "2026-11-26",
    ])
      expect(formatDateCell(v)).not.toMatch(/GMT|UTC/);
  });
  it("shows the day only for a date without time, day + Budapest time otherwise", () => {
    expect(formatDateCell("2026-11-26")).toBe("2026. 11. 26.");
    expect(formatDateCell(new Date("2026-11-26T00:00:00Z"))).toBe("2026. 11. 26.");
    expect(formatDateCell(new Date("2026-11-26T13:30:00Z"))).toBe("2026. 11. 26. 14:30");
  });
  it("ignores non-dates", () => {
    expect(formatDateCell("RSZ-012")).toBeUndefined();
    expect(formatDateCell(5)).toBeUndefined();
  });
});
