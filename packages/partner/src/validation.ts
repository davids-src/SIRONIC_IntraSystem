import { z } from "zod";
import {
  ALVALLALKOZOI_JELENLET_TIPUSOK,
  ALVALLALKOZOI_MUNKATERULETEK,
  ALVALLALKOZOI_SZAMLAZASI_CIKLUSOK,
  ARAZASI_SZERZODES_TIPUSOK,
  ARCHIVALAS_OK_MAX,
  ERDEKLODO_ALLAPOTOK,
  ERDEKLODO_KEZI_TEVEKENYSEG_TIPUSOK,
  PARTNER_SZEREPEK,
  PARTNER_TIPUSOK,
  UGYFEL_KATEGORIAK,
} from "./constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalEmail = z
  .string()
  .trim()
  .max(160)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Érvénytelen e-mail cím");

/** Empty string -> undefined, otherwise must be one of the enum values. */
const optionalEnum = <T extends readonly [string, ...string[]]>(values: T, msg: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || (values as readonly string[]).includes(v), msg)
    .transform((v) => v as T[number] | undefined);

const optionalDate = z
  .union([z.date(), z.string()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined || v === "") return undefined;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Érvénytelen dátum" });
      return z.NEVER;
    }
    return d;
  });

export const cimSchema = z
  .object({
    iranyitoszam: optionalText(16),
    varos: optionalText(120),
    utca: optionalText(200),
    orszag: optionalText(80),
  })
  .transform((c) => (c.iranyitoszam || c.varos || c.utca || c.orszag ? c : undefined));

export const kapcsolattartoSchema = z.object({
  nev: z.string().trim().min(1, "A kapcsolattartó neve kötelező").max(160),
  beosztas: optionalText(120),
  telefon: optionalText(60),
  email: optionalEmail,
  elsodleges: z.boolean().default(false),
});

export const partnerSchema = z
  .object({
    tipus: z.enum(PARTNER_TIPUSOK, { message: "Válassz partnertípust" }),
    nev: z.string().trim().min(1, "A név megadása kötelező").max(200),
    rovidNev: optionalText(80),
    adoszam: optionalText(40),
    cegjegyzekszam: optionalText(40),
    szekhely: cimSchema.optional(),
    szamlazasiCim: cimSchema.optional(),
    telefon: optionalText(60),
    email: optionalEmail,
    bankszamlaszam: optionalText(60),
    kapcsolattartok: z.array(kapcsolattartoSchema).max(30).default([]),
    cimkek: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    megjegyzes: optionalText(4000),
    partnerSzerep: optionalEnum(PARTNER_SZEREPEK, "Érvénytelen szerep"),
    ugyfelKategoria: optionalEnum(UGYFEL_KATEGORIAK, "Érvénytelen ügyfélkategória"),
    arazasiSzerzodesTipus: optionalEnum(
      ARAZASI_SZERZODES_TIPUSOK,
      "Érvénytelen szerződéstípus",
    ),
    szerzodesKezdete: optionalDate,
    szerzodesVege: optionalDate,
    megujitasEmlekeztetoNap: z.coerce.number().int().min(0).max(365).default(30),
    alvallalkozoMunkateruletek: z.array(z.enum(ALVALLALKOZOI_MUNKATERULETEK)).default([]),
    alvallalkozoJelenletTipus: optionalEnum(
      ALVALLALKOZOI_JELENLET_TIPUSOK,
      "Érvénytelen érték",
    ),
    alvallalkozoSzamlazasiCiklus: optionalEnum(
      ALVALLALKOZOI_SZAMLAZASI_CIKLUSOK,
      "Érvénytelen érték",
    ),
  })
  .refine(
    (p) =>
      !p.szerzodesKezdete || !p.szerzodesVege || p.szerzodesVege >= p.szerzodesKezdete,
    { message: "A szerződés vége nem lehet a kezdete előtt", path: ["szerzodesVege"] },
  );

export type PartnerInput = z.input<typeof partnerSchema>;
export type PartnerAdatok = z.output<typeof partnerSchema>;

export const erdeklodoSchema = z.object({
  cegNev: z.string().trim().min(1, "A cégnév megadása kötelező").max(200),
  kapcsolattartoNev: optionalText(160),
  email: optionalEmail,
  telefon: optionalText(60),
  weboldal: optionalText(200),
  forras: optionalText(120),
  kategoria: optionalText(120),
  iparag: optionalText(120),
  becsultErtek: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === "") return undefined;
      const n = typeof v === "number" ? v : Number(v.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        ctx.addIssue({ code: "custom", message: "Érvénytelen összeg" });
        return z.NEVER;
      }
      return n;
    }),
  kovetkezoLepes: optionalText(300),
  kovetkezoLepesIdopont: optionalDate,
  megjegyzes: optionalText(4000),
  uzletiEgyseg: optionalText(120),
});

export type ErdeklodoInput = z.input<typeof erdeklodoSchema>;
export type ErdeklodoAdatok = z.output<typeof erdeklodoSchema>;

export const erdeklodoAllapotSchema = z.object({
  allapot: z.enum(ERDEKLODO_ALLAPOTOK),
  megjegyzes: optionalText(1000),
  elvesztesOka: optionalText(300),
});

export const tevekenysegSchema = z.object({
  tipus: z.enum(ERDEKLODO_KEZI_TEVEKENYSEG_TIPUSOK),
  szoveg: z.string().trim().min(1, "A szöveg megadása kötelező").max(2000),
});

export const archivalasSchema = z.object({
  ok: z.string().trim().min(1, "Az archiválás okát meg kell adni").max(ARCHIVALAS_OK_MAX),
});
