import { describe, expect, it } from "vitest";
import { scanPortal, scanSource } from "../../../../scripts/verify-portal-isolation.mjs";

type Violation = { file: string; line: number; message: string };
const scan = (text: string, file = "apps/portal/src/lib/x.ts"): Violation[] =>
  scanSource(file, text);

describe("verify-portal-isolation guard", () => {
  it("the real portal sources are clean", () => {
    expect(scanPortal()).toEqual([]);
  });

  it("flags a facade call without a nezo argument", () => {
    const v = scan(
      `import { szervizApi } from "@erp/szerviz";\nszervizApi.getHibajegy(id);`,
    );
    expect(v).toHaveLength(1);
    expect(v[0]?.message).toMatch(/without a `nezo`/);
  });

  it("accepts calls that pass nezo (also nested) and Tokennel methods", () => {
    expect(
      scan(
        `import { bizonylatApi } from "@erp/bizonylat";
bizonylatApi.getIgazolas(id, nezo);
bizonylatApi.listSzamlakPortal({ page: 1 }, nezo);
bizonylatApi.elfogadIgazolasTokennel(token, adat);`,
      ),
    ).toEqual([]);
  });

  it("flags aliasing and destructuring of a facade", () => {
    expect(
      scan(
        `import { projektApi } from "@erp/projekt";\nconst { getProjekt } = projektApi;`,
      ),
    ).toHaveLength(1);
  });

  it("flags models, drivers and the staff auth stack", () => {
    expect(scan(`import mongoose from "mongoose";`)).toHaveLength(1);
    expect(scan(`import { User } from "@erp/db-core";`)).toHaveLength(1);
    expect(scan(`import { auth } from "@erp/auth";`)).toHaveLength(1);
    expect(
      scan(`import { X } from "@erp/projekt/src/models/Projekt";`).length,
    ).toBeGreaterThan(0);
    expect(scan(`import { connectDB } from "@erp/db-core";`)).toEqual([]);
    expect(scan(`import type { User } from "@erp/db-core";`)).toEqual([]);
  });

  it("flags a hand-built portal viewer outside lib/nezo.ts", () => {
    expect(scan(`const v = { kind: "portal", partnerId: p };`)).toHaveLength(1);
    expect(scan(`const v = { kind: "portal" };`, "apps/portal/src/lib/nezo.ts")).toEqual(
      [],
    );
  });
});
