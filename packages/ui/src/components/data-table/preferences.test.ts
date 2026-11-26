import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  getDefaultVisibleColumns,
  getTablePreferences,
  setTablePreferences,
  saveVisibleColumns,
} from "./preferences";

function mockLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
  vi.stubGlobal("localStorage", ls);
  return ls;
}

describe("table preferences", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("returns all default visible columns when no prefs", () => {
    const cols = [
      { key: "a", defaultVisible: true },
      { key: "b", defaultVisible: false },
      { key: "c" },
    ];
    expect(getDefaultVisibleColumns("t1", cols)).toEqual(["a", "c"]);
  });

  it("persists visible columns", () => {
    setTablePreferences("t1", { visibleColumns: ["b"] });
    expect(getTablePreferences("t1").visibleColumns).toEqual(["b"]);
    const cols = [{ key: "a", defaultVisible: false }, { key: "b" }];
    expect(getDefaultVisibleColumns("t1", cols)).toEqual(["b"]);
  });

  it("remembers the last applied sort so it can be re-applied on the next visit", () => {
    setTablePreferences("t1", { sort: "rendszam" });
    expect(getTablePreferences("t1").sort).toBe("rendszam");

    setTablePreferences("t1", { sort: "-rendszam" });
    expect(getTablePreferences("t1").sort).toBe("-rendszam");
  });

  it("stores a cleared sort as null, which is falsy and therefore not re-applied", () => {
    setTablePreferences("t1", { sort: "rendszam" });
    setTablePreferences("t1", { sort: null });
    expect(getTablePreferences("t1").sort).toBeNull();
  });

  it("keeps preferences per table id", () => {
    setTablePreferences("t1", { sort: "rendszam", pageSize: 100 });
    setTablePreferences("t2", { sort: "nev" });

    expect(getTablePreferences("t1").sort).toBe("rendszam");
    expect(getTablePreferences("t1").pageSize).toBe(100);
    expect(getTablePreferences("t2").sort).toBe("nev");
    expect(getTablePreferences("t2").pageSize).toBeUndefined();
  });

  it("merges a patch instead of dropping the other preferences", () => {
    setTablePreferences("t1", { visibleColumns: ["a"], pageSize: 50 });
    setTablePreferences("t1", { sort: "nev" });

    const prefs = getTablePreferences("t1");
    expect(prefs.visibleColumns).toEqual(["a"]);
    expect(prefs.pageSize).toBe(50);
    expect(prefs.sort).toBe("nev");
  });

  it("keeps a hidden default-visible column hidden on the next visit", () => {
    const cols = [{ key: "a" }, { key: "b" }, { key: "createdAt" }];
    saveVisibleColumns("t1", ["a", "b"], cols);
    expect(getDefaultVisibleColumns("t1", cols)).toEqual(["a", "b"]);
  });

  it("still shows a column that was added to the table after the choice was saved", () => {
    saveVisibleColumns("t1", ["a"], [{ key: "a" }, { key: "createdAt" }]);
    const later = [{ key: "a" }, { key: "createdAt" }, { key: "novel" }];
    expect(getDefaultVisibleColumns("t1", later)).toEqual(["a", "novel"]);
  });
});
