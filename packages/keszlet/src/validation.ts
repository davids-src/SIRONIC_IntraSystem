/** Zod schemas of the Készlet Server Actions — the facade validates again where it matters. */
import { z } from "zod";
import {
  KESZLET_JEGYZET_MAX,
  RAKTARHELY_KOD_MINTA,
  RAKTARHELY_TIPUSOK,
} from "./constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Legfeljebb ${max} karakter`)
    .optional()
    .transform((v) => (v ? v : undefined));

const mennyiseg = z.coerce
  .number({ error: "Adj meg mennyiséget" })
  .positive("A mennyiség legyen nagyobb nullánál")
  .max(1_000_000, "Túl nagy mennyiség");

const hely = z
  .string()
  .trim()
  .optional()
  .transform((v) => v ?? "");

export const termekSnapshotSchema = z.object({
  nev: z.string().trim().min(1),
  kod: z.string().trim().min(1),
  egyseg: z.string().trim().min(1),
});

export const bevetelSorSchema = z.object({
  arlistaTermekId: z.string().min(1, "Válassz terméket"),
  mennyiseg,
  raktarhelyKod: hely,
  termek: termekSnapshotSchema,
  beszerzesiAr: z.coerce.number().nonnegative().optional(),
  jegyzet: optionalText(KESZLET_JEGYZET_MAX),
});
export const bevetelSchema = z.object({
  sorok: z.array(bevetelSorSchema).min(1, "Legalább egy tétel kell"),
  megjegyzes: optionalText(KESZLET_JEGYZET_MAX),
});

/** Manual allocation: `kulcs` is generated once per dialog open, so a double click is idempotent. */
export const foglalasSchema = z.object({
  mennyiseg,
  kulcs: z.string().trim().min(1),
  jegyzet: optionalText(KESZLET_JEGYZET_MAX),
});

export const raktarhelySchema = z.object({
  kod: z
    .string()
    .trim()
    .min(1, "A kód kötelező")
    .max(60)
    .regex(RAKTARHELY_KOD_MINTA, "Betűk, számok és „/” elválasztó használható"),
  nev: z.string().trim().min(1, "A név kötelező").max(120),
  tipus: z.enum(RAKTARHELY_TIPUSOK),
  leiras: optionalText(500),
});
export type RaktarhelyInput = z.infer<typeof raktarhelySchema>;

export const minimumSchema = z.object({
  minimum: z
    .union([z.literal(""), z.coerce.number().nonnegative()])
    .transform((v) => (v === "" ? null : v)),
});

export const leltarSorSchema = z.object({
  tenyleges: z.coerce
    .number({ error: "Adj meg számot" })
    .nonnegative("Nem lehet negatív"),
  indoklas: optionalText(KESZLET_JEGYZET_MAX),
});

export const rmaSchema = z.object({
  arlistaTermekId: z.string().min(1, "Válassz terméket"),
  termek: termekSnapshotSchema,
  gyariSzam: optionalText(100),
  mennyiseg: z.coerce.number().int().min(1, "Legalább 1 db"),
  partnerId: z.string().min(1, "Válassz partnert"),
  partnerNev: z.string().trim().min(1),
  beszallitoNev: optionalText(120),
  megjegyzes: optionalText(KESZLET_JEGYZET_MAX),
});
export type RmaInput = z.infer<typeof rmaSchema>;

export const rmaAtmenetSchema = z.object({
  jegyzet: optionalText(KESZLET_JEGYZET_MAX),
  beszallitoNev: optionalText(120),
});
