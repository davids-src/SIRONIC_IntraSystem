import { describe, expect, it } from "vitest";
import {
  buildListFilter,
  canDelete,
  canRead,
  canReveal,
  canShare,
  canWrite,
  shareLevelOf,
  type SecretAccessSubject,
} from "./access";
import { SECRETS_PERMISSIONS as P, type SecretViewer } from "./constants";

const ALL = Object.values(P);
const viewer = (
  userId: string,
  permissions: readonly string[] = ALL,
  roleIds: string[] = [],
): SecretViewer => ({
  userId,
  permissions,
  roleIds,
});
const secret = (shares: SecretAccessSubject["shares"] = []): SecretAccessSubject => ({
  ownerId: "owner",
  shares,
});

describe("access", () => {
  it("owner with all keys can do everything", () => {
    const v = viewer("owner");
    const s = secret();
    expect(
      [canRead, canReveal, canWrite, canDelete, canShare].map((f) => f(v, s)),
    ).toEqual([true, true, true, true, true]);
  });

  it("a stranger with all keys (even admin) sees nothing", () => {
    const v = viewer("other");
    expect(canRead(v, secret())).toBe(false);
    expect(canReveal(v, secret())).toBe(false);
  });

  it("the key is required even for the owner", () => {
    const v = viewer("owner", [P.read]);
    expect(canReveal(v, secret())).toBe(false);
    expect(canWrite(v, secret())).toBe(false);
    expect(canDelete(v, secret())).toBe(false);
    expect(canShare(v, secret())).toBe(false);
    expect(canRead(viewer("owner", []), secret())).toBe(false);
  });

  it("a user share grants read + reveal, not write/delete/share", () => {
    const s = secret([{ kind: "user", targetId: "u1", level: "read" }]);
    const v = viewer("u1");
    expect(canRead(v, s)).toBe(true);
    expect(canReveal(v, s)).toBe(true);
    expect(canWrite(v, s)).toBe(false);
    expect(canDelete(v, s)).toBe(false);
    expect(canShare(v, s)).toBe(false);
  });

  it("a role share works through the viewer's roles; edit level allows write", () => {
    const s = secret([{ kind: "role", targetId: "r1", level: "edit" }]);
    expect(canWrite(viewer("u2", ALL, ["r1"]), s)).toBe(true);
    expect(canRead(viewer("u2", ALL, ["r2"]), s)).toBe(false);
    expect(shareLevelOf(viewer("u2", ALL, ["r1"]), s)).toBe("edit");
  });

  it("the best level wins; shared reveal still needs the reveal key", () => {
    const s = secret([
      { kind: "user", targetId: "u1", level: "read" },
      { kind: "role", targetId: "r1", level: "edit" },
    ]);
    expect(shareLevelOf(viewer("u1", ALL, ["r1"]), s)).toBe("edit");
    expect(canReveal(viewer("u1", [P.read]), s)).toBe(false);
  });

  it("list filter is empty without the read key", () => {
    expect(buildListFilter(viewer("u", []), [])).toEqual({ _id: { $in: [] } });
    expect(buildListFilter(viewer("u"), ["a"])).toEqual({
      $or: [{ ownerId: "u" }, { _id: { $in: ["a"] } }],
    });
  });
});
