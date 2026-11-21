import { describe, expect, it } from "vitest";
import {
  alapMenu,
  menuBejegyzesek,
  normalizalKereses,
  szuresMenu,
  type MenuBejegyzes,
} from "./menu-kereses";

const menu: MenuBejegyzes[] = [
  { label: "Vezérlőpult", href: "/", csoport: "Általános" },
  { label: "Árlista", href: "/arlista", csoport: "Árlista" },
  { label: "Szolgáltatások", href: "/arlista/szolgaltatasok", csoport: "Árlista" },
  { label: "Ajánlatok", href: "/ertekesites", csoport: "Értékesítés" },
  { label: "Partnerek", href: "/partner", csoport: "Partnerek" },
];

describe("menu search", () => {
  it("ignores accents and case", () => {
    expect(normalizalKereses("  ÁRLista  ")).toBe("arlista");
    expect(szuresMenu(menu, "vezerlo").map((m) => m.href)).toEqual(["/"]);
  });

  it("ranks label prefix before label contains before module match", () => {
    const r = szuresMenu(menu, "arlista").map((m) => m.href);
    expect(r).toEqual(["/arlista", "/arlista/szolgaltatasok"]);
    expect(szuresMenu(menu, "ertekesites").map((m) => m.href)).toEqual(["/ertekesites"]);
  });

  it("requires every word and returns nothing for an empty term", () => {
    expect(szuresMenu(menu, "arlista szolg").map((m) => m.href)).toEqual([
      "/arlista/szolgaltatasok",
    ]);
    expect(szuresMenu(menu, "   ")).toEqual([]);
    expect(szuresMenu(menu, "nincsilyen")).toEqual([]);
  });

  it("respects the limit", () => {
    expect(szuresMenu(menu, "a", 2)).toHaveLength(2);
  });

  it("flattens groups once per href and gates admin entries by permission", () => {
    const flat = menuBejegyzesek([
      { label: "A", items: [{ href: "/x", label: "X" }] },
      { label: "B", items: [{ href: "/x", label: "X again" }] },
    ]);
    expect(flat).toEqual([{ label: "X", href: "/x", csoport: "A" }]);
    const none = alapMenu(() => false).flatMap((g) => g.items.map((i) => i.href));
    expect(none).not.toContain("/admin/users");
    const all = alapMenu(() => true).flatMap((g) => g.items.map((i) => i.href));
    expect(all).toContain("/admin/users");
  });
});
