import { describe, expect, it } from "vitest";
import { mapEszkoz, mapMozgas, migraljEszkozok } from "./eszkoz";

const ids = new Map([
  ["u1", "N1"],
  ["u2", "N2"],
]);

describe("mapEszkoz", () => {
  it("maps statuses, condition and drops tenantId-era fields", () => {
    const r = mapEszkoz(
      {
        _id: "t1",
        name: " Fúró ",
        brand: "Bosch",
        status: "in_warehouse",
        condition: "fair",
      },
      ids,
    );
    expect(r).toMatchObject({
      megnevezes: "Fúró",
      marka: "Bosch",
      allapot: "raktaron",
      fizikaiAllapot: "megfelelo",
    });
    expect(r.birtokosUserId).toBeUndefined();
  });

  it("maps the holder through the id map", () => {
    const r = mapEszkoz(
      { _id: "t1", name: "X", status: "checked_out", assigned_to: "u2" },
      ids,
    );
    expect(r).toMatchObject({ allapot: "kiadva", birtokosUserId: "N2" });
  });

  it("falls back to raktáron with a warning for an unmappable holder", () => {
    const w: string[] = [];
    const r = mapEszkoz(
      { _id: "t1", name: "X", status: "checked_out", assigned_to: "ghost" },
      ids,
      w,
    );
    expect(r.allapot).toBe("raktaron");
    expect(w).toHaveLength(1);
  });

  it("accepts a plain record as id map and defaults condition to jó", () => {
    const r = mapEszkoz(
      { _id: "t", name: "X", status: "checked_out", assigned_to: "a" },
      { a: "B" },
    );
    expect(r.birtokosUserId).toBe("B");
    expect(r.fizikaiAllapot).toBe("jo");
  });
});

describe("mapMozgas", () => {
  it("maps types and users", () => {
    const r = mapMozgas(
      {
        _id: "x",
        tool_id: "t1",
        actor_id: "u1",
        type: "check_out",
        target_user_id: "u2",
      },
      ids,
    );
    expect(r).toMatchObject({ tipus: "kiadas", vegrehajtoId: "N1", celUserId: "N2" });
  });
  it("skips unmappable actors and unknown types", () => {
    const w: string[] = [];
    expect(
      mapMozgas({ _id: "x", tool_id: "t", actor_id: "ghost", type: "retire" }, ids, w),
    ).toBeNull();
    expect(
      mapMozgas({ _id: "y", tool_id: "t", actor_id: "u1", type: "bogus" }, ids, w),
    ).toBeNull();
    expect(w).toHaveLength(2);
  });
});

describe("migraljEszkozok", () => {
  it("drops orphan movements and sorts oldest first", () => {
    const r = migraljEszkozok(
      [{ _id: "t1", name: "A" }],
      [
        {
          _id: "b",
          tool_id: "t1",
          actor_id: "u1",
          type: "retire",
          created_at: "2024-02-01",
        },
        {
          _id: "a",
          tool_id: "t1",
          actor_id: "u1",
          type: "maintenance_start",
          created_at: "2024-01-01",
        },
        { _id: "c", tool_id: "nope", actor_id: "u1", type: "retire" },
      ],
      ids,
    );
    expect(r.mozgasok.map((m) => m.legacyId)).toEqual(["a", "b"]);
    expect(r.figyelmeztetesek).toHaveLength(1);
  });
});
