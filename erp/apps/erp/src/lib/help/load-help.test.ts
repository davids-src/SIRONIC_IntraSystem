import { describe, expect, it } from "vitest";
import {
  getHelpArticleBySlug,
  getHelpArticlesForUser,
  groupHelpArticlesBySection,
} from "./load-help";

describe("load-help integration", () => {
  it("loads index article for any authenticated user", () => {
    const article = getHelpArticleBySlug("index", []);
    expect(article).not.toBeNull();
    expect(article?.title).toContain("Áttekintés");
  });

  it("filters permission-gated articles", () => {
    const withPerm = getHelpArticlesForUser(["users:read"]);
    const withoutPerm = getHelpArticlesForUser([]);

    expect(withPerm.some((a) => a.slug === "admin-felhasznalok")).toBe(true);
    expect(withoutPerm.some((a) => a.slug === "admin-felhasznalok")).toBe(false);
    expect(withoutPerm.some((a) => a.slug === "index")).toBe(true);
  });

  it("gates the Partnerek articles on their read permissions", () => {
    const slugs = (keys: string[]) => getHelpArticlesForUser(keys).map((a) => a.slug);
    expect(slugs(["partner:partner:read"])).toEqual(
      expect.arrayContaining(["partner-lista", "partner-adatlap"]),
    );
    expect(slugs(["partner:partner:read"])).not.toContain("erdeklodok");
    expect(slugs(["partner:erdeklodo:read"])).toContain("erdeklodok");
    expect(slugs([])).not.toContain("partner-lista");
  });

  it("gates the Titoktár articles on their permission keys", () => {
    const slugs = (keys: string[]) => getHelpArticlesForUser(keys).map((a) => a.slug);
    expect(slugs(["secrets:titok:read"])).toContain("titoktar");
    expect(slugs(["secrets:titok:read"])).toContain("titoktar-adatlap");
    expect(slugs(["secrets:titok:read"])).not.toContain("titoktar-megosztas");
    expect(slugs(["secrets:titok:share"])).toContain("titoktar-megosztas");
    expect(slugs([])).not.toContain("titoktar");
  });

  it("gates the árlista articles on their page permissions", () => {
    const slugs = (perms: string[]) => getHelpArticlesForUser(perms).map((a) => a.slug);
    expect(slugs([])).not.toContain("arlista-termekek");
    expect(slugs(["arlista:termek:read"])).toContain("arlista-termekek");
    expect(slugs(["arlista:termek:read"])).not.toContain("arlista-szolgaltatasok");
    expect(slugs(["arlista:szolgaltatas:read"])).toContain("arlista-szolgaltatasok");
    expect(slugs(["arlista:szolgaltatas:read"])).not.toContain("arlista-beallitasok");
    expect(slugs(["arlista:beallitas:write"])).toContain("arlista-beallitasok");
  });

  it("gates the Projektek articles on their page permissions", () => {
    const slugs = (keys: string[]) => getHelpArticlesForUser(keys).map((a) => a.slug);
    expect(slugs([])).not.toContain("projekt-lista");
    expect(slugs(["projekt:projekt:read"])).toEqual(
      expect.arrayContaining(["projekt-lista", "projekt-adatlap"]),
    );
    expect(slugs(["projekt:projekt:read"])).not.toContain("projekt-koltsegek");
    expect(slugs(["projekt:koltseg:read"])).toContain("projekt-koltsegek");
    expect(slugs(["projekt:hetiterv:read"])).toContain("projekt-heti-terv");
    expect(slugs(["projekt:projekt:read"])).not.toContain("projekt-heti-terv");
    expect(slugs(["projekt:sablon:read"])).toContain("projekt-sablonok");
    const sections = groupHelpArticlesBySection(
      getHelpArticlesForUser(["projekt:projekt:read", "users:read"]),
    ).map((s) => s.name);
    expect(sections).toContain("Projektek");
    expect(sections.indexOf("Projektek")).toBeLessThan(
      sections.indexOf("Adminisztráció"),
    );
  });

  it("gates the Projektek articles on their page permissions", () => {
    const slugs = (keys: string[]) => getHelpArticlesForUser(keys).map((a) => a.slug);
    expect(slugs([])).not.toContain("projekt-lista");
    expect(slugs(["projekt:projekt:read"])).toEqual(
      expect.arrayContaining(["projekt-lista", "projekt-adatlap"]),
    );
    expect(slugs(["projekt:projekt:read"])).not.toContain("projekt-koltsegek");
    expect(slugs(["projekt:koltseg:read"])).toContain("projekt-koltsegek");
    expect(slugs(["projekt:hetiterv:read"])).toContain("projekt-heti-terv");
    expect(slugs(["projekt:projekt:read"])).not.toContain("projekt-heti-terv");
    expect(slugs(["projekt:sablon:read"])).toContain("projekt-sablonok");
    const sections = groupHelpArticlesBySection(
      getHelpArticlesForUser(["projekt:projekt:read", "users:read"]),
    ).map((s) => s.name);
    expect(sections).toContain("Projektek");
    expect(sections.indexOf("Projektek")).toBeLessThan(
      sections.indexOf("Adminisztráció"),
    );
  });

  it("gates the Értékesítés articles on their page permissions and orders the section after Árlista", () => {
    const slugs = (perms: string[]) => getHelpArticlesForUser(perms).map((a) => a.slug);
    expect(slugs([])).not.toContain("ajanlatok");
    expect(slugs(["ertekesites:ajanlat:read"])).toContain("ajanlatok");
    expect(slugs(["ertekesites:ajanlat:read"])).not.toContain("ajanlat-varazslo");
    expect(slugs(["ertekesites:ajanlat:write"])).toContain("ajanlat-varazslo");
    expect(slugs(["ertekesites:ajanlat:read"])).not.toContain("szerzodesek");
    expect(slugs(["ertekesites:szerzodes:read"])).toContain("szerzodesek");
    expect(slugs(["ertekesites:megrendelo:read"])).toContain("megrendelolapok");
    expect(slugs(["ertekesites:szerzodes:read"])).not.toContain("megrendelolapok");
    const nevek = groupHelpArticlesBySection(
      getHelpArticlesForUser(["ertekesites:ajanlat:read", "arlista:termek:read"]),
    ).map((s) => s.name);
    expect(nevek.indexOf("Árlista")).toBeLessThan(nevek.indexOf("Értékesítés"));
    expect(nevek.indexOf("Értékesítés")).toBeLessThan(
      nevek.indexOf("Titoktár") === -1 ? 99 : nevek.indexOf("Titoktár"),
    );
  });

  it("groups sections with Áttekintés first", () => {
    const sections = groupHelpArticlesBySection(
      getHelpArticlesForUser(["users:read", "roles:manage"]),
    );
    expect(sections.length).toBeGreaterThan(0);
    expect(sections[0]?.name).toBe("Áttekintés");
  });

  it("gates the Eszközök articles on eszkoz:eszkoz:read", () => {
    const nelkul = getHelpArticlesForUser([]);
    const jogosult = getHelpArticlesForUser(["eszkoz:eszkoz:read"]);
    for (const slug of ["eszkoz-lista", "eszkoz-adatlap"]) {
      expect(nelkul.some((a) => a.slug === slug)).toBe(false);
      expect(jogosult.some((a) => a.slug === slug)).toBe(true);
    }
    expect(groupHelpArticlesBySection(jogosult).some((s) => s.name === "Eszközök")).toBe(
      true,
    );
  });

  it("gates the Készlet articles on their page permissions", () => {
    const slugs = (perms: string[]) => getHelpArticlesForUser(perms).map((a) => a.slug);
    expect(slugs([])).not.toContain("keszlet-muszerfal");
    for (const slug of [
      "keszlet-muszerfal",
      "keszlet-lista",
      "keszlet-leltar",
      "keszlet-raktarhelyek",
    ]) {
      expect(slugs(["keszlet:keszlet:read"])).toContain(slug);
    }
    expect(slugs(["keszlet:keszlet:read"])).not.toContain("keszlet-bevetelezes");
    expect(slugs(["keszlet:keszlet:read"])).not.toContain("keszlet-rma");
    expect(slugs(["keszlet:bevetel:write"])).toContain("keszlet-bevetelezes");
    expect(slugs(["keszlet:rma:read"])).toContain("keszlet-rma");
    const sections = groupHelpArticlesBySection(
      getHelpArticlesForUser(["keszlet:keszlet:read"]),
    );
    expect(sections.some((s) => s.name === "Készlet")).toBe(true);
  });
});
