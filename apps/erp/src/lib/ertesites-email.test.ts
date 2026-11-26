import { describe, expect, it, vi } from "vitest";
import {
  abszolutLink,
  ertesitesEmailKategoria,
  htmlEscape,
  jelzesEmailKategoria,
  kuldErtesitoEmailek,
  type EmailFuggosegek,
} from "./ertesites-email";

function fuggosegek(opts: { feliratkozott: string[]; hibas?: string[] }) {
  const kuldott: Array<{
    templateKey: string;
    to: string;
    variables: Record<string, string>;
  }> = [];
  const deps: EmailFuggosegek = {
    cimzettek: vi.fn(async (ids: string[]) =>
      ids
        .filter((id) => opts.feliratkozott.includes(id))
        .map((id) => ({ id, email: `${id}@example.com`, nev: `Név <${id}>` })),
    ),
    kuld: vi.fn(async (o) => {
      if (opts.hibas?.includes(o.to)) throw new Error("smtp down");
      kuldott.push(o);
      return { sent: true };
    }),
    appUrl: () => "https://erp.example.com/",
  };
  return { deps, kuldott };
}

describe("kuldErtesitoEmailek", () => {
  it("mails only the opted-in recipients, with the category template and escaped text", async () => {
    const { deps, kuldott } = fuggosegek({ feliratkozott: ["a"] });
    const db = await kuldErtesitoEmailek(
      ["a", "b", "a"],
      "feladat_uj",
      { title: "Fal <b>bontás</b>", body: "A & B", url: "/feladatok/123" },
      deps,
    );
    expect(db).toBe(1);
    expect(deps.cimzettek).toHaveBeenCalledWith(["a", "b"], "feladat_uj");
    expect(kuldott).toEqual([
      {
        templateKey: "ertesites_feladat_uj",
        to: "a@example.com",
        variables: {
          name: "Név &lt;a&gt;",
          cim: "Fal &lt;b&gt;bontás&lt;/b&gt;",
          szoveg: "A &amp; B",
          link: "https://erp.example.com/feladatok/123",
        },
      },
    ]);
  });

  it("sends nothing when nobody opted in, and never throws on a mail failure", async () => {
    const senki = fuggosegek({ feliratkozott: [] });
    expect(await kuldErtesitoEmailek(["a"], "jelzes", { title: "x" }, senki.deps)).toBe(
      0,
    );
    expect(senki.deps.kuld).not.toHaveBeenCalled();

    const hiba = fuggosegek({ feliratkozott: ["a", "b"], hibas: ["a@example.com"] });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(
      await kuldErtesitoEmailek(["a", "b"], "jelzes", { title: "x" }, hiba.deps),
    ).toBe(1);
    log.mockRestore();
  });

  it("survives a failing recipient lookup", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const deps: EmailFuggosegek = {
      cimzettek: async () => {
        throw new Error("db down");
      },
      kuld: vi.fn(async () => ({ sent: true })),
      appUrl: () => "https://erp.example.com",
    };
    expect(await kuldErtesitoEmailek(["a"], "jelzes", { title: "x" }, deps)).toBe(0);
    log.mockRestore();
  });
});

describe("category mapping", () => {
  it('jelzesKuld: explicit wins, a real Jelzés is "jelzes", push-only sends none', () => {
    expect(jelzesEmailKategoria({})).toBe("jelzes");
    expect(jelzesEmailKategoria({ jelzes: true })).toBe("jelzes");
    expect(jelzesEmailKategoria({ jelzes: false })).toBeNull();
    expect(
      jelzesEmailKategoria({ jelzes: false, emailKategoria: "feladat_valtozas" }),
    ).toBe("feladat_valtozas");
    expect(jelzesEmailKategoria({ emailKategoria: false })).toBeNull();
  });

  it('module notifications: task link + "given to you" title is new, other task events change', () => {
    expect(
      ertesitesEmailKategoria({ title: "Új szerződéskérés", url: "/feladatok/1" }),
    ).toBe("feladat_uj");
    expect(
      ertesitesEmailKategoria({
        title: "Rád osztott szakasz: Árazás",
        url: "/feladatok/1",
      }),
    ).toBe("feladat_uj");
    expect(
      ertesitesEmailKategoria({ title: "Elvetve: Valami", url: "/feladatok/1" }),
    ).toBe("feladat_valtozas");
    expect(
      ertesitesEmailKategoria({
        title: "Aláírt szerződés: X",
        url: "/vallalkozas/szerzodesek/1",
      }),
    ).toBe("jelzes");
    expect(
      ertesitesEmailKategoria({
        title: "Új x",
        url: "/feladatok/1",
        emailKategoria: false,
      }),
    ).toBeNull();
    expect(
      ertesitesEmailKategoria({
        title: "Bármi",
        url: "/feladatok/1",
        emailKategoria: "feladat_uj",
      }),
    ).toBe("feladat_uj");
  });
});

describe("helpers", () => {
  it("abszolutLink", () => {
    expect(abszolutLink("/feladatok/1", "https://a.hu/")).toBe(
      "https://a.hu/feladatok/1",
    );
    expect(abszolutLink("https://x.hu/y", "https://a.hu")).toBe("https://x.hu/y");
    expect(abszolutLink("//evil.com", "https://a.hu")).toBe("https://a.hu/");
    expect(abszolutLink("javascript:alert(1)", "https://a.hu")).toBe("https://a.hu/");
    expect(abszolutLink(undefined, "https://a.hu")).toBe("https://a.hu/");
  });

  it("htmlEscape", () => {
    expect(htmlEscape(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});
