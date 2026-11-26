/** Zod schemas of the Projekt Server Actions — the facade validates again. */
import { z } from "zod";
import {
  CHECKLIST_KATEGORIAK,
  FAZIS_ALLAPOTOK,
  HETI_ALLAPOTOK,
  JELOLO_TIPUSOK,
  KOLTSEG_TIPUSOK,
  NEV_MAX,
  OK_MAX,
  PRIORITASOK,
  STAGING_JOVAHAGYASOK,
  SZOVEG_MAX,
} from "./constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Legfeljebb ${max} karakter`)
    .optional()
    .transform((v) => (v ? v : undefined));

const nev = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} kötelező`)
    .max(NEV_MAX, `Legfeljebb ${NEV_MAX} karakter`);

/** `YYYY-MM-DD` calendar date, kept as a string; the facade converts it. */
export const optionalDatum = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) =>
      v === undefined || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))),
    {
      message: "Érvénytelen dátum",
    },
  );

export const requiredDatum = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)), {
    message: "Érvénytelen dátum",
  });

const optionalNumber = z
  .union([z.number(), z.string().trim()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
    message: "Érvénytelen szám",
  });

export const archivalasSchema = z.object({
  ok: z
    .string()
    .trim()
    .min(1, "Az archiválás okát meg kell adni")
    .max(OK_MAX, `Legfeljebb ${OK_MAX} karakter`),
});

// ── Projekt ──────────────────────────────────────────────────────────────────────────────────
export const projektSchema = z
  .object({
    nev: nev("A projekt neve"),
    partnerId: optionalText(100),
    /** Snapshot of the partner's name — the app resolves it, the facade stores it. */
    partnerNev: optionalText(NEV_MAX),
    leiras: optionalText(SZOVEG_MAX),
    kategoria: optionalText(100),
    kezdet: optionalDatum,
    hatarido: optionalDatum,
    tervezettOrak: optionalNumber,
    felelosId: optionalText(100),
    portalLathato: z.boolean().default(false),
    belsoJegyzet: optionalText(SZOVEG_MAX),
  })
  .refine((v) => !v.partnerId || !!v.partnerNev, {
    path: ["partnerId"],
    message: "A partner nevét nem sikerült meghatározni",
  });
export type ProjektInput = z.input<typeof projektSchema>;

export const fazisSchema = z.object({
  nev: nev("A fázis neve"),
  allapot: z.enum(FAZIS_ALLAPOTOK, "Válassz állapotot").default("fuggoben"),
  hatarido: optionalDatum,
  szazalek: z
    .union([z.number(), z.string().trim()])
    .transform((v) => (v === "" ? 0 : Number(v)))
    .refine((v) => Number.isFinite(v) && v >= 0 && v <= 100, {
      message: "A készültség 0 és 100 közötti szám",
    })
    .default(0),
});
export type FazisInput = z.input<typeof fazisSchema>;

export const checklistTetelSchema = z.object({
  cimke: nev("A tétel szövege"),
  kategoria: z.enum(CHECKLIST_KATEGORIAK, "Válassz kategóriát").default("egyeb"),
  kotelezo: z.boolean().default(false),
  mellekletKotelezo: z.boolean().default(false),
});
export type ChecklistTetelInput = z.input<typeof checklistTetelSchema>;

export const stagingLinkSchema = z.object({
  cimke: nev("A link címkéje"),
  url: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => /^https?:\/\/[^\s]+$/i.test(v), {
      message: "Az URL-nek http:// vagy https:// kezdetűnek kell lennie",
    }),
});

export const stagingJovahagyasSchema = z.object({
  jovahagyas: z.enum(STAGING_JOVAHAGYASOK),
  megjegyzes: optionalText(SZOVEG_MAX),
});

// ── Költség ──────────────────────────────────────────────────────────────────────────────────
export const koltsegSchema = z.object({
  projektId: z.string().min(1, "A projekt kötelező"),
  tipus: z.enum(KOLTSEG_TIPUSOK, "Válassz költségtípust"),
  leiras: optionalText(SZOVEG_MAX),
  osszeg: z
    .union([z.number(), z.string().trim()])
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v >= 0, { message: "Érvénytelen összeg" }),
  penznem: z.string().trim().min(1).max(8).default("HUF"),
  datum: requiredDatum,
  bizonylatMediaId: optionalText(100),
  munkalapId: optionalText(100),
});
export type KoltsegInput = z.input<typeof koltsegSchema>;

// ── Heti terv ────────────────────────────────────────────────────────────────────────────────
export const hetiTervSchema = z.object({
  felelosId: z.string().min(1, "Válaszd ki a felelőst"),
  cim: nev("A cím"),
  leiras: optionalText(SZOVEG_MAX),
  ev: z
    .union([z.number(), z.string().trim()])
    .transform(Number)
    .refine((v) => Number.isInteger(v) && v >= 2000 && v <= 2100, {
      message: "Érvénytelen év",
    }),
  het: z
    .union([z.number(), z.string().trim()])
    .transform(Number)
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 53, {
      message: "Érvénytelen hét",
    }),
  prioritas: z.enum(PRIORITASOK, "Válassz prioritást").default("kozepes"),
  hatarido: optionalDatum,
  hibajegyId: optionalText(100),
  projektId: optionalText(100),
  munkalapId: optionalText(100),
});
export type HetiTervInput = z.input<typeof hetiTervSchema>;

export const hetiAllapotSchema = z.enum(HETI_ALLAPOTOK, "Érvénytelen állapot");

// ── Sablon ───────────────────────────────────────────────────────────────────────────────────
export const sablonSchema = z.object({
  nev: nev("A sablon neve"),
  leiras: optionalText(SZOVEG_MAX),
  kategoria: optionalText(100),
  tetelek: z
    .array(
      z.object({
        szoveg: nev("A tétel szövege"),
        kotelezo: z.boolean().default(false),
        mellekletKotelezo: z.boolean().default(false),
      }),
    )
    .min(1, "Legalább egy tétel kell"),
});
export type SablonInput = z.input<typeof sablonSchema>;

// ── Alaprajz ─────────────────────────────────────────────────────────────────────────────────
export const alaprajzSchema = z.object({
  nev: nev("Az alaprajz neve"),
  partnerId: optionalText(100),
  projektId: optionalText(100),
  fajlMediaId: z.string().trim().min(1, "Tölts fel egy fájlt"),
  jelolok: z
    .array(
      z.object({
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        cimke: optionalText(NEV_MAX),
        tipus: z.enum(JELOLO_TIPUSOK).default("egyeb"),
        leiras: optionalText(SZOVEG_MAX),
        hibajegyId: optionalText(100),
        eszkozId: optionalText(100),
      }),
    )
    .default([]),
});
export type AlaprajzInput = z.input<typeof alaprajzSchema>;
