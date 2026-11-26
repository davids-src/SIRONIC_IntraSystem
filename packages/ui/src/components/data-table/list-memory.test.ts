import { describe, expect, it } from "vitest";
import {
  hasTableParams,
  isMeaningfulListQuery,
  listMemoryPath,
  listScrollKey,
  pickForeignParams,
  pickTableParams,
  recallListQuery,
  recallListScroll,
  rememberedListHref,
  rememberListQuery,
  rememberListScroll,
  restoredListSearch,
  type StorageLike,
} from "./list-memory";

function memoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
}

const qs = (s: string) => new URLSearchParams(s);

describe("list memory params", () => {
  it("splits table params from foreign ones", () => {
    const p = qs(
      "ev=2026&search=cat&f.status=aktiv&f.status=szerviz&open=abc&page=2&pageSize=25",
    );
    expect(pickTableParams(p).toString()).toBe(
      "search=cat&f.status=aktiv&f.status=szerviz&page=2&pageSize=25",
    );
    expect(pickForeignParams(p).toString()).toBe("ev=2026&open=abc");
    expect(hasTableParams(qs("ev=2026"))).toBe(false);
    expect(hasTableParams(qs("ev=2026&sort=-nev"))).toBe(true);
  });

  it("treats page 1 + page size alone as nothing worth restoring", () => {
    expect(isMeaningfulListQuery("")).toBe(false);
    expect(isMeaningfulListQuery("page=1&pageSize=50")).toBe(false);
    expect(isMeaningfulListQuery("page=3&pageSize=50")).toBe(true);
    expect(isMeaningfulListQuery("sort=nev")).toBe(true);
    expect(isMeaningfulListQuery("f.tipus=daru&page=1")).toBe(true);
  });
});

describe("remember / recall", () => {
  it("stores only the table params, per path", () => {
    const storage = memoryStorage();
    rememberListQuery("/gepeszet/gepek", qs("ev=1&search=cat&page=2"), storage);
    expect(recallListQuery("/gepeszet/gepek?ev=1", storage)).toBe("search=cat&page=2");
    expect(recallListQuery("/gepeszet/kiserteku-eszkozok", storage)).toBeNull();
  });

  it("an explicit clear is remembered as an empty query", () => {
    const storage = memoryStorage();
    rememberListQuery("/gepeszet/gepek", qs("search=cat"), storage);
    rememberListQuery("/gepeszet/gepek", qs(""), storage);
    expect(recallListQuery("/gepeszet/gepek", storage)).toBe("");
    expect(
      restoredListSearch(qs(""), recallListQuery("/gepeszet/gepek", storage)),
    ).toBeNull();
  });

  it("works without storage", () => {
    rememberListQuery("/x", qs("search=a"), null);
    expect(recallListQuery("/x", null)).toBeNull();
    expect(rememberedListHref("/x", null)).toBe("/x");
  });
});

describe("rememberedListHref", () => {
  it("returns the list with its remembered query", () => {
    const storage = memoryStorage();
    rememberListQuery(
      "/gepeszet/gepek",
      qs("f.status=aktiv&page=2&pageSize=25"),
      storage,
    );
    expect(rememberedListHref("/gepeszet/gepek", storage)).toBe(
      "/gepeszet/gepek?f.status=aktiv&page=2&pageSize=25",
    );
  });

  it("keeps the bare link when nothing meaningful is remembered", () => {
    const storage = memoryStorage();
    expect(rememberedListHref("/gepeszet/gepek", storage)).toBe("/gepeszet/gepek");
    rememberListQuery("/gepeszet/gepek", qs("page=1&pageSize=25"), storage);
    expect(rememberedListHref("/gepeszet/gepek", storage)).toBe("/gepeszet/gepek");
  });

  it("keeps foreign params of the link and lets explicit table params win", () => {
    const storage = memoryStorage();
    rememberListQuery("/hr/munkaido", qs("tab=havi&search=kiss"), storage);
    expect(rememberedListHref("/hr/munkaido?tab=havi", storage)).toBe(
      "/hr/munkaido?search=kiss&tab=havi",
    );
    expect(rememberedListHref("/hr/munkaido?tab=havi&f.allapot=nyitott", storage)).toBe(
      "/hr/munkaido?tab=havi&f.allapot=nyitott",
    );
  });

  it("does not carry one view’s query to another view of the same path", () => {
    const storage = memoryStorage();
    rememberListQuery("/hr/munkaido", qs("search=kiss"), storage);
    expect(rememberedListHref("/hr/munkaido?tab=havi", storage)).toBe(
      "/hr/munkaido?tab=havi",
    );
  });
});

describe("per-view memory (Feladatok tabs on one path)", () => {
  it("keys the memory by path plus the view-picking foreign params", () => {
    expect(
      listMemoryPath("/feladatok", qs("nezet=kiadott&page=1&f.allapot=kiadva")),
    ).toBe("/feladatok?nezet=kiadott");
    expect(listMemoryPath("/feladatok", qs("page=2"))).toBe("/feladatok");
    // A side sheet or the export frame never splits the memory; order does not matter.
    expect(listMemoryPath("/x", qs("open=1&__export=t&b=2&a=1"))).toBe("/x?a=1&b=2");
  });

  it('a bare /feladatok does not get the "Általam kiadott" filter (regression: empty list)', () => {
    const storage = memoryStorage();
    const kiadott = qs("nezet=kiadott&page=1&f.allapot=kiadva&f.allapot=elfogadva");
    rememberListQuery("/feladatok", kiadott, storage);
    // Opening Feladatok from the sidebar: no params → Teendőim, whose állapot values differ.
    const bare = qs("");
    expect(
      restoredListSearch(
        bare,
        recallListQuery(listMemoryPath("/feladatok", bare), storage),
      ),
    ).toBeNull();
    // Coming back to the same tab still restores its own filter.
    const tab = qs("nezet=kiadott");
    expect(
      restoredListSearch(
        tab,
        recallListQuery(listMemoryPath("/feladatok", tab), storage),
      ),
    ).toBe("nezet=kiadott&page=1&f.allapot=kiadva&f.allapot=elfogadva");
  });

  it("a clear on one view leaves the other views remembered", () => {
    const storage = memoryStorage();
    rememberListQuery("/feladatok", qs("f.sav=lejart"), storage);
    rememberListQuery("/feladatok", qs("nezet=kiadott&search=a"), storage);
    rememberListQuery("/feladatok", qs("nezet=kiadott"), storage);
    expect(recallListQuery("/feladatok?nezet=kiadott", storage)).toBe("");
    expect(recallListQuery("/feladatok", storage)).toBe("f.sav=lejart");
  });
});

describe("restoredListSearch", () => {
  it("fills a bare list URL from the remembered query, keeping foreign params", () => {
    expect(restoredListSearch(qs("open=abc"), "search=cat&page=2")).toBe(
      "open=abc&search=cat&page=2",
    );
    expect(restoredListSearch(qs(""), "sort=-nev&pageSize=50")).toBe(
      "sort=-nev&pageSize=50",
    );
  });

  it("never overrides a URL that already carries table params", () => {
    expect(restoredListSearch(qs("page=1&pageSize=10"), "search=cat")).toBeNull();
    expect(restoredListSearch(qs("f.tipus=daru"), "search=cat")).toBeNull();
  });

  it("does nothing without a meaningful remembered query", () => {
    expect(restoredListSearch(qs(""), null)).toBeNull();
    expect(restoredListSearch(qs(""), "")).toBeNull();
    expect(restoredListSearch(qs(""), "page=1&pageSize=25")).toBeNull();
  });
});

describe("scroll memory", () => {
  it("keys scroll by path and table query only", () => {
    expect(listScrollKey("/gepeszet/gepek", qs("open=1&search=a"))).toBe(
      "/gepeszet/gepek?search=a",
    );
    expect(listScrollKey("/gepeszet/gepek", qs("open=1"))).toBe("/gepeszet/gepek");
  });

  it("round-trips and tolerates garbage", () => {
    const storage = memoryStorage();
    rememberListScroll("/a", { page: 120, table: 40 }, storage);
    expect(recallListScroll("/a", storage)).toEqual({ page: 120, table: 40 });
    storage.setItem("erp:list-scroll:v1:/b", "not json");
    expect(recallListScroll("/b", storage)).toBeNull();
    expect(recallListScroll("/c", storage)).toBeNull();
  });
});
