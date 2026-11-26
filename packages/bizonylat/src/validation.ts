import { z } from "zod";
import {
  AFA_KULCSOK,
  ALAIRAS_MAX_KARAKTER,
  ALAIRAS_MIME_TIPUSOK,
  ARCHIVALAS_OK_MAX,
  IGAZOLAS_FORRASOK,
  JOGI_SZOVEG_MAX,
  JOTALLAS_EV_MAX,
  JOTALLAS_TAROLT_ALLAPOTOK,
  PENZNEMEK,
} from "./constants";

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const optDate = z
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

const nap = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Érvénytelen dátum (ÉÉÉÉ-HH-NN)");
const nonNeg = z.coerce.number().min(0, "Nem lehet negatív");
const afa = z.coerce
  .number()
  .refine((v) => (AFA_KULCSOK as readonly number[]).includes(v), "Érvénytelen ÁFA-kulcs");

export const archivalasSchema = z.object({
  ok: z.string().trim().min(1, "Az ok megadása kötelező").max(ARCHIVALAS_OK_MAX),
});

export const megjegyzesSchema = z.object({ megjegyzes: optText(1000) });

// ── Szállítólevél ──────────────────────────────────────────────────────────────

export const szallitolevelSorSchema = z.object({
  arlistaTermekId: z.string().trim().min(1, "A termék kötelező"),
  nev: z.string().trim().min(1, "A megnevezés kötelező").max(300),
  mennyiseg: z.coerce.number().positive("A mennyiség legyen pozitív"),
  egyseg: z.string().trim().min(1, "Az egység kötelező").max(30),
  raktarhelyKod: optText(60),
});

export const szallitolevelSchema = z.object({
  partnerId: z.string().trim().min(1, "Válassz partnert"),
  projektId: optText(60),
  kiadasNap: nap,
  megjegyzes: optText(2000),
  sorok: z.array(szallitolevelSorSchema).max(200).default([]),
});
export type SzallitolevelInput = z.infer<typeof szallitolevelSchema>;

// ── Teljesítésigazolás ─────────────────────────────────────────────────────────

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

export const igazolasSorSchema = z.object({
  leiras: z.string().trim().min(1, "A tétel megnevezése kötelező").max(500),
  mennyiseg: z.coerce.number().positive("A mennyiség legyen pozitív"),
  egyseg: z.string().trim().min(1, "Az egység kötelező").max(30),
  nettoEgysegar: nonNeg,
  afaKulcs: afa.default(27),
  arSnapshot: arSnapshotSchema.optional(),
  beszerzesiEgysegar: nonNeg.optional(),
});

export const igazolasSchema = z.object({
  cim: z.string().trim().min(1, "A cím kötelező").max(200),
  partnerId: z.string().trim().min(1, "Válassz partnert"),
  partnerEmail: z
    .union([z.literal(""), z.string().trim().email("Érvénytelen e-mail cím")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  projektId: optText(60),
  ajanlatId: optText(60),
  munkalapIds: z.array(z.string().trim().min(1)).max(200).default([]),
  forras: z.enum(IGAZOLAS_FORRASOK).default("kezi"),
  munkaOsszegzes: z.string().trim().min(1, "A munka összefoglalása kötelező").max(8000),
  idoszakKezdet: optDate,
  idoszakVege: optDate,
  osszOra: nonNeg.optional(),
  penznem: z.enum(PENZNEMEK).default("HUF"),
  belsoMegjegyzes: optText(4000),
  sorok: z.array(igazolasSorSchema).max(300).default([]),
});
export type IgazolasInput = z.infer<typeof igazolasSchema>;

const DATA_URI = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)$/i;

/** Signature: PNG/JPEG/WebP data-URI of limited size. */
export const alairasKepSchema = z
  .string()
  .max(ALAIRAS_MAX_KARAKTER, "Az aláírás képe túl nagy")
  .superRefine((v, ctx) => {
    const m = DATA_URI.exec(v);
    if (!m) {
      ctx.addIssue({ code: "custom", message: "Érvénytelen aláírás-kép (data-URI)" });
      return;
    }
    if (!(ALAIRAS_MIME_TIPUSOK as readonly string[]).includes(m[1]!.toLowerCase()))
      ctx.addIssue({
        code: "custom",
        message: "Az aláírás csak PNG, JPEG vagy WebP lehet",
      });
    if ((m[2]!.length * 3) / 4 < 100)
      ctx.addIssue({ code: "custom", message: "Az aláírás képe üres" });
  });

export const igazolasElfogadasSchema = z.object({
  nev: z.string().trim().min(1, "Az aláíró neve kötelező").max(160),
  beosztas: z.string().trim().min(1, "Az aláíró beosztása kötelező").max(160),
  kep: alairasKepSchema,
});
export type IgazolasElfogadasInput = z.infer<typeof igazolasElfogadasSchema>;

export const igazolasElutasitasSchema = z.object({
  ok: z.string().trim().min(1, "Az elutasítás okát meg kell adni").max(2000),
});

// ── Számla ─────────────────────────────────────────────────────────────────────

export const szamlaSorSchema = z.object({
  leiras: z.string().trim().min(1, "A tétel megnevezése kötelező").max(500),
  mennyiseg: z.coerce.number().positive("A mennyiség legyen pozitív"),
  egyseg: z.string().trim().min(1, "Az egység kötelező").max(30),
  nettoEgysegar: nonNeg,
  afaKulcs: afa.default(27),
});

export const szamlaSchema = z.object({
  partnerId: z.string().trim().min(1, "Válassz partnert"),
  cim: optText(200),
  igazolasId: optText(60),
  penznem: z.enum(PENZNEMEK).default("HUF"),
  esedekes: optDate,
  sorok: z.array(szamlaSorSchema).min(1, "Legalább egy tétel kell").max(200),
});
export type SzamlaInput = z.infer<typeof szamlaSchema>;

// ── Jótállás ───────────────────────────────────────────────────────────────────

export const jotallasSorSchema = z.object({
  termekNev: z.string().trim().min(1, "A termék neve kötelező").max(300),
  arlistaTermekId: optText(60),
  gyariSzam: optText(120),
  evek: z.coerce.number().int().min(1, "Legalább 1 év").max(JOTALLAS_EV_MAX),
  kezdet: nap,
});

export const jotallasSchema = z.object({
  partnerId: z.string().trim().min(1, "Válassz partnert"),
  szamlaszam: optText(60),
  kiallitasNap: nap,
  megjegyzes: optText(2000),
  sorok: z.array(jotallasSorSchema).min(1, "Legalább egy tétel kell").max(100),
});
export type JotallasInput = z.infer<typeof jotallasSchema>;

export const jotallasAllapotSchema = z.object({
  allapot: z.enum(JOTALLAS_TAROLT_ALLAPOTOK),
  megjegyzes: optText(1000),
});

export const jotallasiSzovegSchema = z.object({
  szoveg: z.string().trim().min(1, "A jogi szöveg kötelező").max(JOGI_SZOVEG_MAX),
});
