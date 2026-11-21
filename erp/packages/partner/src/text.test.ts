import { describe, expect, it } from "vitest";
import { partnerNevKulcs } from "./text";

describe("partnerNevKulcs", () => {
  it("folds case, accents and whitespace", () => {
    expect(partnerNevKulcs("  Árvíztűrő   Tükörfúrógép Kft. ")).toBe(
      "arvizturo tukorfurogep kft.",
    );
  });
});
