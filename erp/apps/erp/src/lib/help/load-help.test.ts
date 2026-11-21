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
});
