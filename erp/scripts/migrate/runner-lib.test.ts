import { describe, expect, it } from "vitest";
import {
  LEGACY_COLLECTIONS,
  Report,
  assertDbName,
  assertWritableCollections,
  initialStatus,
  isBcryptHash,
  mapRoleKeys,
  maxTrailing,
  resolveUris,
  summarizeTenants,
  trailingNumber,
  validateUri,
} from "./runner-lib";

describe("database safety", () => {
  it("accepts crm_dev only", () => {
    expect(() => assertDbName("crm_dev")).not.toThrow();
    for (const db of ["crm", "sironic_auth", "erp_dev", "", undefined]) {
      expect(() => assertDbName(db)).toThrow(/Refusing/);
    }
  });

  it("defaults to the crm_dev copy and rejects other databases in overrides", () => {
    expect(resolveUris({}).legacyUri).toBe("mongodb://192.168.0.12:27017/crm_dev");
    expect(
      resolveUris({ TARGET_MONGODB_URI: "mongodb://x:1/crm_dev?a=b" }).targetUri,
    ).toBe("mongodb://x:1/crm_dev");
    expect(() => validateUri("mongodb://192.168.0.12:27017/crm", "target")).toThrow();
    expect(() => validateUri("mongodb://h/sironic_auth", "legacy")).toThrow();
    expect(() => resolveUris({ LEGACY_MONGODB_URI: "mongodb://h/erp_dev" })).toThrow();
    expect(() => validateUri("not a uri", "target")).toThrow();
  });

  it("refuses to write legacy collections", () => {
    expect(() =>
      assertWritableCollections(["partnerek", "users", "erp_counters"]),
    ).not.toThrow();
    for (const legacy of ["counters", "contacts", "settings", "crmusers", "secrets"]) {
      expect(LEGACY_COLLECTIONS).toContain(legacy);
      expect(() => assertWritableCollections(["partnerek", legacy])).toThrow(legacy);
    }
  });
});

describe("numbers", () => {
  it("reads the trailing number", () => {
    expect(trailingNumber("OFF-2026-0007")).toBe(7);
    expect(trailingNumber("SZL-000012")).toBe(12);
    expect(trailingNumber("abc")).toBe(0);
    expect(trailingNumber(undefined)).toBe(0);
    expect(maxTrailing(["PR-000003", "PR-000010", null, "x"])).toBe(10);
    expect(maxTrailing([])).toBe(0);
  });
});

describe("tenants", () => {
  it("is ok with one tenant and flags several", () => {
    const one = summarizeTenants({ contacts: [{ _id: "t1", n: 3 }], empty: [] });
    expect(one.ok).toBe(true);
    expect(one.distinct).toEqual(["t1"]);
    const two = summarizeTenants({
      a: [{ _id: "t1", n: 1 }],
      b: [{ _id: "t2", n: 1 }],
    });
    expect(two.ok).toBe(false);
    expect(two.distinct).toEqual(["t1", "t2"]);
  });
});

describe("users", () => {
  it("maps roles and recognises bcrypt hashes", () => {
    expect(mapRoleKeys(["crm.admin"])).toEqual({ roleKeys: ["admin"], unmapped: [] });
    expect(mapRoleKeys(["crm.admin", "crm.x"])).toEqual({
      roleKeys: ["admin"],
      unmapped: ["crm.x"],
    });
    expect(mapRoleKeys(undefined)).toEqual({ roleKeys: [], unmapped: [] });
    expect(isBcryptHash(`$2b$10$${"a".repeat(53)}`)).toBe(true);
    expect(isBcryptHash("plain")).toBe(false);
    expect(isBcryptHash(undefined)).toBe(false);
  });
});

describe("initialStatus", () => {
  it("builds status, history and optional assignee", () => {
    const at = new Date("2026-01-02T00:00:00Z");
    const s = initialStatus("kesz", at, "u1", "u2");
    expect(s.status.key).toBe("kesz");
    expect(s.statusHistory).toHaveLength(1);
    expect(s.assignee).toEqual({ userId: "u2", assignedAt: at, assignedBy: "u1" });
    expect(initialStatus("kesz", at, "u1").assignee).toBeNull();
  });
});

describe("Report", () => {
  it("collects rows", () => {
    const r = new Report();
    r.row("x").read = 2;
    r.warn("x", "w");
    expect(r.row("x").warnings).toEqual(["w"]);
    expect(r.format()).toContain("x");
  });
});
