import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  contrastRatio,
  hexToOklch,
  readableOn,
  resolveTheme,
  themeCss,
  validateTheme,
} from "./theme";

describe("theme engine", () => {
  it("accepts the default theme", () => {
    expect(validateTheme(DEFAULT_THEME)).toEqual({});
  });

  it("rejects red as primary and green as warning", () => {
    const e = validateTheme({ ...DEFAULT_THEME, primary: "#dc2626", warning: "#16a34a" });
    expect(e.primary).toMatch(/piros/);
    expect(e.warning).toMatch(/borostyán/);
  });

  it("only allows red for danger and green for success", () => {
    expect(validateTheme({ ...DEFAULT_THEME, danger: "#2563eb" }).danger).toBeTruthy();
    expect(validateTheme({ ...DEFAULT_THEME, success: "#dc2626" }).success).toBeTruthy();
    expect(
      validateTheme({ ...DEFAULT_THEME, danger: "#b91c1c", success: "#16a34a" }),
    ).toEqual({});
  });

  it("lets secondary / accent be neutral in any hue", () => {
    expect(
      validateTheme({ ...DEFAULT_THEME, accent: "#f5f0f0", secondary: "#1a1a1a" }),
    ).toEqual({});
  });

  it("rejects a secondary that cannot be told from the primary", () => {
    expect(
      validateTheme({ ...DEFAULT_THEME, secondary: "#f86a16" }).secondary,
    ).toBeTruthy();
  });

  it("rejects bad hex and falls back to defaults when resolving", () => {
    expect(validateTheme({ ...DEFAULT_THEME, primary: "teal" }).primary).toBeTruthy();
    expect(resolveTheme({ primary: "nope" }).primary).toBe(DEFAULT_THEME.primary);
    expect(resolveTheme({ primary: "#2563EB" }).primary).toBe("#2563eb");
    // an invalid combination as a whole falls back
    expect(resolveTheme({ primary: "#dc2626" })).toEqual(DEFAULT_THEME);
  });

  it("picks a readable foreground", () => {
    for (const bg of ["#0f766e", "#facc15", "#0c1233", "#f4f4f5"])
      expect(contrastRatio(bg, readableOn(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it("emits light and dark variables with the same keys, hex-only inputs", () => {
    const css = themeCss({ primary: "#2563eb" });
    expect(css).toContain(":root{--primary:#2563eb");
    expect(css).toContain(".dark{--primary:");
    expect(css).not.toMatch(/[<>{}]\s*[<>]/);
    const keys = (s: string) => [...s.matchAll(/(--[a-z-]+):/g)].map((m) => m[1]).sort();
    const [light, dark] = css.split(".dark{");
    expect(keys(light!)).toEqual(keys(dark!));
  });

  it("converts hex to oklch sensibly", () => {
    expect(hexToOklch("#ffffff").l).toBeCloseTo(1, 2);
    expect(hexToOklch("#dc2626").h).toBeGreaterThan(20);
    expect(hexToOklch("#dc2626").h).toBeLessThan(35);
  });
});
