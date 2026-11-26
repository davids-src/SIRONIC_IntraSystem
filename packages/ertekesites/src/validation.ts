import { z } from "zod";
import {
  AFA_KULCSOK,
  AJANLAT_ALLAPOTOK,
  ALAIRAS_TIPUSOK,
  ARCHIVALAS_OK_MAX,
  ELVESZTES_OKOK,
  PENZNEMEK,
  SOR_FORRASOK,
  SOR_TIPUSOK,
  SZERZODES_ALLAPOTOK,
  SZERZODES_TIPUSOK,
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

const nonNeg = z.coerce.number().min(0, "Nem lehet negatív");
const afa = z.coerce
  .number()
  .refine((v) => (AFA_KULCSOK as readonly number[]).includes(v), "Érvénytelen ÁFA-kulcs");

export const archivalasSchema = z.object({
  ok: z.string().trim().min(1, "Az ok megadása kötelező").max(ARCHIVALAS_OK_MAX),
});

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

export const ajanlatSorSchema = z
  .object({
    forras: z.enum(SOR_FORRASOK),
    sorTipus: z.enum(SOR_TIPUSOK).default("termek"),
    leiras: z.string().trim().min(1, "A tétel megnevezése kötelező").max(500),
    mennyiseg: z.coerce.number().positive("A mennyiség legyen pozitív"),
    egyseg: z.string().trim().min(1, "Az egység kötelező").max(30),
    nettoEgysegar: nonNeg,
    afaKulcs: afa.default(27),
    kedvezmenySzazalek: z.coerce.number().min(0).max(100).optional(),
    csomagId: z.string().optional(),
    csomagSzulo: z.boolean().optional(),
    arSnapshot: arSnapshotSchema.optional(),
    beszerzesiEgysegar: nonNeg.optional(),
    belsoKoltseg: nonNeg.optional(),
  })
  .refine((s) => s.forras === "kezi" || s.arSnapshot !== undefined, {
    message: "Árlistás tételhez az árlista-snapshot kötelező",
    path: ["arSnapshot"],
  });
export type AjanlatSorInput = z.infer<typeof ajanlatSorSchema>;

export const ajanlatSchema = z.object({
  cim: z.string().trim().min(1, "Az ajánlat címe kötelező").max(200),
  partnerId: z.string().trim().min(1, "Válassz partnert"),
  penznem: z.enum(PENZNEMEK).default("HUF"),
  ervenyesseg: optDate,
  megjegyzes: optText(4000),
  uzletiEgyseg: optText(80),
  globalisKedvezmenySzazalek: z.coerce.number().min(0).max(100).default(0),
  sorok: z.array(ajanlatSorSchema).max(300).default([]),
});
export type AjanlatInput = z.infer<typeof ajanlatSchema>;

export const ajanlatAllapotSchema = z.object({
  allapot: z.enum(AJANLAT_ALLAPOTOK),
  megjegyzes: optText(1000),
  elvesztesOka: z.enum(ELVESZTES_OKOK).optional(),
  elvesztesMegjegyzes: optText(1000),
});
export type AjanlatAllapotInput = z.infer<typeof ajanlatAllapotSchema>;

export const utankovetesSchema = z.object({
  utankovetes: optDate,
  utankovetesMegjegyzes: optText(1000),
  kovetkezoLepes: optText(300),
  kovetkezoLepesIdopont: optDate,
});
export type UtankovetesInput = z.infer<typeof utankovetesSchema>;

// ── Szerződés ──────────────────────────────────────────────────────────────────

export const szerzodesSablonSchema = z.object({
  nev: z.string().trim().min(1, "A sablon neve kötelező").max(160),
  kategoria: z.string().trim().min(1, "A kategória kötelező").max(80),
  leiras: optText(1000),
  szoveg: z.string().trim().min(1, "A sablon szövege kötelező").max(200_000),
  digitalisAlairasKell: z.boolean().default(false),
  aktiv: z.boolean().default(true),
});
export type SzerzodesSablonInput = z.infer<typeof szerzodesSablonSchema>;

export const szerzodesSchema = z
  .object({
    tipus: z.enum(SZERZODES_TIPUSOK),
    nev: z.string().trim().min(1, "A szerződés neve kötelező").max(200),
    kategoria: z.string().trim().min(1, "A kategória kötelező").max(80),
    partnerId: z.string().trim().min(1, "Válassz partnert"),
    sablonId: z.string().optional(),
    valtozok: z.record(z.string(), z.string().max(2000)).default({}),
    fajlHivatkozas: optText(1000),
    fajlNev: optText(200),
    alairasTipus: z.enum(ALAIRAS_TIPUSOK).default("nincs"),
    ervenyessegKezdete: optDate,
    ervenyessegVege: optDate,
    projektId: optText(60),
    portalLathato: z.boolean().default(false),
    megjegyzes: optText(4000),
  })
  .refine((s) => s.tipus !== "generalt" || !!s.sablonId, {
    message: "Generált szerződéshez sablon kell",
    path: ["sablonId"],
  });
export type SzerzodesInput = z.infer<typeof szerzodesSchema>;

export const szerzodesAllapotSchema = z.object({
  allapot: z.enum(SZERZODES_ALLAPOTOK),
  megjegyzes: optText(1000),
  ugyfelNev: optText(160),
  alairasAdat: optText(200_000),
});
export type SzerzodesAllapotInput = z.infer<typeof szerzodesAllapotSchema>;

// ── Megrendelőlap ──────────────────────────────────────────────────────────────

export const megrendeloSorSchema = z.object({
  arlistaTetelId: z.string().optional(),
  leiras: z.string().trim().min(1, "A tétel megnevezése kötelező").max(500),
  mennyiseg: z.coerce.number().positive("A mennyiség legyen pozitív"),
  egyseg: z.string().trim().min(1, "Az egység kötelező").max(30),
  nettoEgysegar: nonNeg,
  afaKulcs: afa.default(27),
});

export const megrendeloSchema = z.object({
  beszallitoId: z.string().trim().min(1, "Válassz beszállítót"),
  projektId: optText(60),
  ajanlatId: optText(60),
  penznem: z.enum(PENZNEMEK).default("HUF"),
  varhatoSzallitas: optDate,
  megjegyzes: optText(4000),
  sorok: z.array(megrendeloSorSchema).max(300).default([]),
});
export type MegrendeloInput = z.infer<typeof megrendeloSchema>;

export const megrendeloAllapotSchema = z.object({
  allapot: z.enum(["piszkozat", "elkuldve", "torolt"]),
  megjegyzes: optText(1000),
});
