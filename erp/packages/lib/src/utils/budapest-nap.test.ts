import { describe, expect, it } from "vitest";
import { budapestNap, budapestNapVege } from "./budapest-nap";

describe("budapestNap", () => {
  it("uses the Budapest calendar day, not UTC", () => {
    // 23:30 UTC on 1 Jul is already 2 Jul 01:30 in Budapest (CEST).
    expect(budapestNap(new Date("2026-07-01T23:30:00Z"))).toBe("2026-07-02");
    expect(budapestNap(new Date("2026-01-10T22:30:00Z"))).toBe("2026-01-10");
    expect(budapestNap(new Date("2026-01-10T23:30:00Z"))).toBe("2026-01-11");
  });
});

describe("budapestNapVege", () => {
  it("is 23:59:59.999 Budapest time, in summer and winter", () => {
    expect(budapestNapVege(new Date("2026-07-01T10:00:00Z")).toISOString()).toBe(
      "2026-07-01T21:59:59.999Z",
    );
    expect(budapestNapVege(new Date("2026-01-10T10:00:00Z")).toISOString()).toBe(
      "2026-01-10T22:59:59.999Z",
    );
  });
});
