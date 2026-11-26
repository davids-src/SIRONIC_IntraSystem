/**
 * Theme engine: the admin picks six role colours, the engine checks that each colour fits its
 * role and derives every token the UI needs (foregrounds, soft tints, borders, dark mode).
 *
 * Roles and their rules (hue = OKLCH hue in degrees):
 *  - danger  (error buttons / alerts) must be red,
 *  - warning must be amber / yellow-orange,
 *  - success must be green,
 *  - primary / secondary / accent must NOT use a status hue (red, amber, green) unless they are
 *    near-neutral — so a button the user reads as "delete" never looks like "save".
 * Pure functions, no runtime imports: shared by the server (layout CSS, validation on save) and
 * the client (live preview in Arculat).
 */

export const THEME_ROLES = [
  "primary",
  "secondary",
  "accent",
  "success",
  "warning",
  "danger",
] as const;
export type ThemeRole = (typeof THEME_ROLES)[number];
export type ThemeColors = Record<ThemeRole, string>;

export const THEME_ROLE_LABELS: Record<ThemeRole, { label: string; help: string }> = {
  primary: {
    label: "Elsődleges",
    help: "Fő gombok, linkek, aktív elemek. Nem lehet piros, sárga vagy zöld.",
  },
  secondary: {
    label: "Másodlagos",
    help: "Háttér- és kiegészítő gombok. Nem lehet piros, sárga vagy zöld.",
  },
  accent: {
    label: "Kiemelő",
    help: "Finom kiemelés: menü- és listaelemek fölé húzáskor. Nem lehet piros, sárga vagy zöld.",
  },
  success: {
    label: "Siker",
    help: "Kész, jóváhagyva állapotok. Csak zöld árnyalat lehet.",
  },
  warning: {
    label: "Figyelmeztetés",
    help: "Határidő közeleg, figyelem. Csak borostyán / sárgás-narancs árnyalat lehet.",
  },
  danger: {
    label: "Hiba / törlés",
    help: "Hibák, törlés, lejárt. Csak piros árnyalat lehet.",
  },
};

/** Out-of-the-box colours (primary: the SIRONIC orange of `globals.css`). */
export const DEFAULT_THEME: ThemeColors = {
  primary: "#f96611",
  secondary: "#0c1233",
  accent: "#f4f4f5",
  success: "#059669",
  warning: "#b45309",
  danger: "#dc2626",
};

type Band = { min: number; max: number };
/** Status hues, reserved for the status roles. */
const BANDS: Record<
  "danger" | "warning" | "success",
  Band & { minChroma: number; name: string }
> = {
  danger: { min: 10, max: 40, minChroma: 0.14, name: "piros" },
  warning: { min: 45, max: 110, minChroma: 0.1, name: "borostyán / sárgás-narancs" },
  success: { min: 135, max: 175, minChroma: 0.1, name: "zöld" },
};
/** Below this chroma a colour counts as neutral (grey / navy-black) and may sit in any hue. */
const NEUTRAL_CHROMA = 0.05;
const PRIMARY_MIN_CHROMA = 0.04;
const MIN_PRIMARY_SECONDARY_DISTANCE = 0.08;

// ── colour maths (sRGB hex ↔ OKLCH) ──────────────────────────────────────────────────────────

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

type Oklch = { l: number; c: number; h: number };

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const fromLinear = (v: number) =>
  v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;

export function hexToOklch(hex: string): Oklch {
  const n = parseInt(hex.slice(1), 16);
  const r = toLinear(((n >> 16) & 255) / 255);
  const g = toLinear(((n >> 8) & 255) / 255);
  const b = toLinear((n & 255) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  const h = c < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

function oklchToLinearRgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);

/** OKLCH → hex; chroma is reduced until the colour fits the sRGB gamut. */
export function oklchToHex(color: Oklch): string {
  let { c } = color;
  let rgb = oklchToLinearRgb({ ...color, c });
  for (let i = 0; i < 24 && !inGamut(rgb); i++) {
    c *= 0.9;
    rgb = oklchToLinearRgb({ ...color, c });
  }
  return (
    "#" +
    rgb
      .map((v) =>
        Math.round(
          Math.min(1, Math.max(0, fromLinear(Math.min(1, Math.max(0, v))))) * 255,
        ),
      )
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    toLinear(v / 255),
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE = "#fafafa";
const INK = "#18181b";
/** The readable text colour on `bg` (whichever of near-white / near-black contrasts more). */
export function readableOn(bg: string): string {
  return contrastRatio(bg, WHITE) >= contrastRatio(bg, INK) ? WHITE : INK;
}

function distance(a: Oklch, b: Oklch): number {
  const ax = a.c * Math.cos((a.h * Math.PI) / 180);
  const ay = a.c * Math.sin((a.h * Math.PI) / 180);
  const bx = b.c * Math.cos((b.h * Math.PI) / 180);
  const by = b.c * Math.sin((b.h * Math.PI) / 180);
  return Math.hypot(a.l - b.l, ax - bx, ay - by);
}

// ── validation ───────────────────────────────────────────────────────────────────────────────

const inBand = (h: number, b: Band) => h >= b.min && h <= b.max;

/** Per role: a Hungarian message when the colour does not fit the role. */
export type ThemeErrors = Partial<Record<ThemeRole, string>>;

export function validateTheme(theme: ThemeColors): ThemeErrors {
  const errors: ThemeErrors = {};
  const lch = {} as Record<ThemeRole, Oklch>;
  for (const role of THEME_ROLES) {
    if (!HEX_RE.test(theme[role] ?? "")) {
      errors[role] = "Adj meg érvényes színkódot (pl. #f96611).";
      continue;
    }
    lch[role] = hexToOklch(theme[role]);
  }
  for (const role of ["danger", "warning", "success"] as const) {
    const x = lch[role];
    if (!x || errors[role]) continue;
    const band = BANDS[role];
    if (x.c < band.minChroma || !inBand(x.h, band))
      errors[role] =
        `A(z) ${THEME_ROLE_LABELS[role].label.toLowerCase()} szín csak ${band.name} árnyalat lehet.`;
  }
  for (const role of ["primary", "secondary", "accent"] as const) {
    const x = lch[role];
    if (!x || errors[role]) continue;
    if (x.c >= NEUTRAL_CHROMA) {
      const clash = (Object.keys(BANDS) as Array<keyof typeof BANDS>).find((k) =>
        inBand(x.h, BANDS[k]),
      );
      if (clash)
        errors[role] =
          `Ez a szín ${BANDS[clash].name} — azt a ${THEME_ROLE_LABELS[clash].label.toLowerCase()} szerep használja, ` +
          "hogy ne keveredjen a gombok jelentése. Válassz másik árnyalatot.";
    }
  }
  if (lch.primary && !errors.primary && lch.primary.c < PRIMARY_MIN_CHROMA)
    errors.primary = "Az elsődleges szín legyen kellően élénk, ne szürke.";
  if (
    lch.primary &&
    lch.secondary &&
    !errors.primary &&
    !errors.secondary &&
    distance(lch.primary, lch.secondary) < MIN_PRIMARY_SECONDARY_DISTANCE
  )
    errors.secondary =
      "A másodlagos szín túl hasonlít az elsődlegesre — a két gomb nem különböztethető meg.";
  return errors;
}

export function isValidTheme(theme: ThemeColors): boolean {
  return Object.keys(validateTheme(theme)).length === 0;
}

/** Merges stored (maybe partial / invalid) colours over the defaults; invalid ones fall back. */
export function resolveTheme(
  stored: Partial<Record<ThemeRole, string | undefined | null>> | undefined,
): ThemeColors {
  const out = { ...DEFAULT_THEME };
  for (const role of THEME_ROLES) {
    const v = stored?.[role];
    if (typeof v === "string" && HEX_RE.test(v)) out[role] = v.toLowerCase();
  }
  return isValidTheme(out) ? out : { ...DEFAULT_THEME };
}

// ── token derivation ─────────────────────────────────────────────────────────────────────────

const f = (n: number) => +n.toFixed(4);
const ok = (l: number, c: number, h: number) => `oklch(${f(l)} ${f(c)} ${f(h)})`;

type Tokens = Record<string, string>;

function tone(
  name: "success" | "warning" | "danger",
  hex: string,
  dark: boolean,
): Tokens {
  const { c, h } = hexToOklch(hex);
  const base = dark
    ? oklchToHex({ l: 0.76, c, h })
    : oklchToHex({ l: Math.min(hexToOklch(hex).l, 0.58), c, h });
  const t: Tokens = {
    [`--${name}`]: base,
    [`--${name}-foreground`]: readableOn(base),
    [`--${name}-soft`]: dark ? ok(0.27, 0.06, h) : ok(0.975, 0.025, h),
    [`--${name}-soft-foreground`]: dark
      ? ok(0.84, 0.12, h)
      : ok(0.42, Math.min(c, 0.13), h),
    [`--${name}-border`]: dark ? ok(0.4, 0.09, h) : ok(0.9, 0.075, h),
  };
  return t;
}

function tokensFor(theme: ThemeColors, dark: boolean): Tokens {
  const p = hexToOklch(theme.primary);
  const s = hexToOklch(theme.secondary);
  const a = hexToOklch(theme.accent);
  const primary = dark
    ? oklchToHex({ l: Math.max(p.l, 0.72), c: p.c, h: p.h })
    : theme.primary;
  const secondary = dark
    ? oklchToHex({ l: 0.32, c: Math.min(s.c, 0.06), h: s.h })
    : theme.secondary;
  const accent = dark
    ? oklchToHex({ l: 0.3, c: Math.min(a.c, 0.04), h: a.h })
    : theme.accent;
  const danger = tone("danger", theme.danger, dark);
  return {
    "--primary": primary,
    "--primary-foreground": readableOn(primary),
    "--secondary": secondary,
    "--secondary-foreground": readableOn(secondary),
    "--accent": accent,
    "--accent-foreground": readableOn(accent),
    "--destructive": danger["--danger"]!,
    "--destructive-foreground": danger["--danger-foreground"]!,
    "--ring": ok(dark ? 0.62 : 0.7, Math.min(p.c, 0.1), p.h),
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": readableOn(primary),
    "--chart-1": primary,
    ...tone("success", theme.success, dark),
    ...tone("warning", theme.warning, dark),
    ...danger,
  };
}

/** The variables of one mode as a plain object — for a live preview (`style={…}`). */
export function themeVars(
  stored: Partial<Record<ThemeRole, string | undefined | null>> | undefined,
  dark: boolean,
): Record<string, string> {
  return tokensFor(resolveTheme(stored), dark);
}

const block = (selector: string, t: Tokens) =>
  `${selector}{${Object.entries(t)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;

/**
 * The CSS that overrides the stylesheet's colour variables for light and dark mode. Only values
 * built from validated hex / numbers — safe to inline into a `<style>`.
 */
export function themeCss(
  stored?: Partial<Record<ThemeRole, string | undefined | null>>,
): string {
  const theme = resolveTheme(stored);
  return block(":root", tokensFor(theme, false)) + block(".dark", tokensFor(theme, true));
}
