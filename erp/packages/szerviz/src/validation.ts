import { z } from "zod";
import {
  ALAP_KATEGORIA,
  ALAP_MUNKALAP_KATEGORIA,
  ARCHIVALAS_OK_MAX,
  HIBAJEGY_ALLAPOTOK,
  HIBAJEGY_KEZI_FORRASOK,
  HIBAJEGY_PRIORITASOK,
  KARBANTARTAS_ALAP_ELOREJELZES_NAP,
  KARBANTARTAS_MAX_INTERVALLUM_HONAP,
  MUNKALAP_FORRASOK,
  MUNKALAP_SOR_TIPUSOK,
  PREVENTIV_KATEGORIA,
} from "./constants";
import { alairasHiba } from "./szabalyok";

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const reqDate = z.union([z.date(), z.string()]).transform((v, ctx) => {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) {
    ctx.addIssue({ code: "custom", message: "Érvénytelen dátum" });
    return z.NEVER;
  }
  return d;
});

const ido = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Az idő formátuma ÓÓ:PP")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const archivalasSchema = z.object({
  ok: z.string().trim().min(1, "Az ok megadása kötelező").max(ARCHIVALAS_OK_MAX),
});

// ── Hibajegy ───────────────────────────────────────────────────────────────────

export const hibajegyAlapSchema = z.object({
  targy: z.string().trim().min(1, "A tárgy kötelező").max(200),
  leiras: z.string().trim().min(1, "A leírás kötelező").max(8000),
  kategoria: z.string().trim().min(1).max(80).default(ALAP_KATEGORIA),
  prioritas: z.enum(HIBAJEGY_PRIORITASOK).default("kozepes"),
  helyszin: optText(300),
  erintettTetelek: optText(1000),
  projektId: optText(60),
});

/** Staff-side create / edit (partner, source, assignee and the internal note are staff-only). */
export const hibajegySchema = hibajegyAlapSchema.extend({
  partnerId: optText(60),
  egyszeriNev: optText(120),
  egyszeriTelefon: optText(60),
  forras: z.enum(HIBAJEGY_KEZI_FORRASOK).default("crm"),
  felelosId: optText(60),
  belsoJegyzet: optText(4000),
});
export type HibajegyInput = z.infer<typeof hibajegySchema>;

/** Portal create: no partner / source / assignee / internal note — the facade decides those. */
export const hibajegyPortalSchema = hibajegyAlapSchema.omit({ projektId: true });
export type HibajegyPortalInput = z.infer<typeof hibajegyPortalSchema>;

export const megjegyzesSchema = z.object({
  uzenet: z.string().trim().min(1, "Az üzenet kötelező").max(4000),
  belso: z.coerce.boolean().default(false),
});
export type MegjegyzesInput = z.infer<typeof megjegyzesSchema>;

export const hibajegyAllapotSchema = z.object({
  allapot: z.enum(HIBAJEGY_ALLAPOTOK),
  megjegyzes: optText(1000),
  megoldasJegyzet: optText(4000),
});
export type HibajegyAllapotInput = z.infer<typeof hibajegyAllapotSchema>;

// ── Munkalap ───────────────────────────────────────────────────────────────────

export const arSnapshotSchema = z.object({
  forras: z.enum(["szolgaltatas", "termek"]),
  tetelId: z.string().min(1),
  kod: z.string(),
  nev: z.string(),
  egyseg: z.string(),
  arazasiTipus: z.string(),
  belsoAlapar: z.number(),
  szorzoKulcs: z.string().nullable(),
  ugyfelSzorzo: z.number(),
  kalkulaltAr: z.number(),
  surgosseg: z.string().nullable(),
  surgossegiSzorzo: z.number(),
  vegAr: z.number().min(0),
  egyedi: z.boolean(),
  egysegDb: z.number().nullable(),
  afaKulcs: z.number(),
  penznem: z.string(),
  keszult: z.string(),
});

export const munkalapSorSchema = z
  .object({
    tipus: z.enum(MUNKALAP_SOR_TIPUSOK),
    forras: z.enum(MUNKALAP_FORRASOK).default("kezi"),
    arlistaTetelId: optText(60),
    leiras: z.string().trim().min(1, "A tétel megnevezése kötelező").max(500),
    mennyiseg: z.coerce.number().positive("A mennyiség legyen pozitív"),
    egyseg: z.string().trim().min(1, "Az egység kötelező").max(30),
    nettoEgysegar: z.coerce.number().min(0, "Nem lehet negatív").optional(),
    keszletbolKiad: z.coerce.boolean().default(false),
    arSnapshot: arSnapshotSchema.optional(),
  })
  .refine((s) => s.forras === "kezi" || s.arSnapshot !== undefined, {
    message: "Árlistás tételhez az árlista-snapshot kötelező",
    path: ["arSnapshot"],
  })
  .refine((s) => !s.keszletbolKiad || (s.tipus === "anyag" && s.forras === "termek"), {
    message: "Készletből csak árlistás termék típusú anyag adható ki",
    path: ["keszletbolKiad"],
  });
export type MunkalapSorInput = z.infer<typeof munkalapSorSchema>;

const alairas = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const hiba = alairasHiba(v);
    if (hiba) {
      ctx.addIssue({ code: "custom", message: hiba });
      return z.NEVER;
    }
    return v;
  });

export const munkalapSchema = z.object({
  partnerId: optText(60),
  egyszeriNev: optText(120),
  egyszeriTelefon: optText(60),
  projektId: optText(60),
  hibajegyId: optText(60),
  munkaDatum: reqDate,
  munkaKezdet: ido,
  munkaVege: ido,
  szerelo: z.string().trim().min(1, "A szerelő neve kötelező").max(120),
  szereloAlairas: alairas,
  ugyfelNev: optText(120),
  ugyfelAlairas: alairas,
  helyszin: optText(300),
  kategoria: z.string().trim().min(1).max(80).default(ALAP_MUNKALAP_KATEGORIA),
  leiras: z.string().trim().min(1, "Az elvégzett munka leírása kötelező").max(8000),
  sorok: z.array(munkalapSorSchema).max(200).default([]),
  utazasKm: z.coerce.number().min(0).max(5000).optional(),
  megjegyzes: optText(4000),
});
export type MunkalapInput = z.infer<typeof munkalapSchema>;

// ── Karbantartási terv ─────────────────────────────────────────────────────────

export const karbantartasSchema = z.object({
  cim: z.string().trim().min(1, "A terv címe kötelező").max(200),
  partnerId: z.string().trim().min(1, "Válassz partnert"),
  projektId: optText(60),
  intervallumHonap: z.coerce
    .number()
    .int("Egész hónap kell")
    .min(1, "Legalább 1 hónap")
    .max(KARBANTARTAS_MAX_INTERVALLUM_HONAP),
  elsoEsedekes: reqDate,
  elorejelzesNap: z.coerce
    .number()
    .int()
    .min(0)
    .max(120)
    .default(KARBANTARTAS_ALAP_ELOREJELZES_NAP),
  sablonLeiras: optText(4000),
  kategoria: z.string().trim().min(1).max(80).default(PREVENTIV_KATEGORIA),
  prioritas: z.enum(HIBAJEGY_PRIORITASOK).default("kozepes"),
  felelosId: optText(60),
  aktiv: z.coerce.boolean().default(true),
});
export type KarbantartasInput = z.infer<typeof karbantartasSchema>;
