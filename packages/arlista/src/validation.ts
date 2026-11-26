import { z } from "zod";
import {
  ARAZASI_TIPUSOK,
  ARCHIVALAS_OK_MAX,
  KOD_ELOTAG_MINTA,
  ORADIJ_KATEGORIAK,
  PENZNEMEK,
  SURGOSSEG_KULCSOK,
  TETEL_TIPUSOK,
  UGYFEL_SZORZO_KULCSOK,
  ANYAG_POTLEK_KULCSOK,
} from "./constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const nonNegative = z.coerce.number().min(0, "Nem lehet negatív");

export const beszerzesiAdatSchema = z.object({
  beszallitoNev: z.string().trim().min(1, "A beszállító neve kötelező").max(160),
  beszallitoCikkszam: optionalText(80),
  nettoBeszerzesiAr: nonNegative,
  beszerzesDatuma: z.coerce.date(),
  megjegyzes: optionalText(500),
});
export type BeszerzesiAdatInput = z.infer<typeof beszerzesiAdatSchema>;

export const createTermekSchema = z.object({
  tipus: z.enum(TETEL_TIPUSOK).default("termek"),
  /** Overrides the default prefix of the type (e.g. `HW`). */
  kodElotag: z
    .string()
    .trim()
    .toUpperCase()
    .regex(KOD_ELOTAG_MINTA, "A kódelőtag 1–6 nagybetű/szám, betűvel kezdődik")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  nev: z.string().trim().min(1, "A név megadása kötelező").max(200),
  leiras: optionalText(2000),
  kategoria: z.string().trim().min(1, "A kategória megadása kötelező").max(100),
  egyseg: z.string().trim().min(1, "Az egység megadása kötelező").max(30),
  nettoAr: nonNegative,
  penznem: z.enum(PENZNEMEK).default("HUF"),
  afaKulcs: z.coerce.number().min(0).max(100).default(27),
  aktiv: z.coerce.boolean().default(true),
  megjegyzes: optionalText(2000),
});
export type CreateTermekInput = z.infer<typeof createTermekSchema>;

export const updateTermekSchema = createTermekSchema.omit({
  tipus: true,
  kodElotag: true,
});
export type UpdateTermekInput = z.infer<typeof updateTermekSchema>;

export const archivalasSchema = z.object({
  ok: z
    .string()
    .trim()
    .min(3, "Az archiválás okának megadása kötelező")
    .max(ARCHIVALAS_OK_MAX),
});

export const egysegSavSchema = z
  .object({
    cimke: z.string().trim().min(1, "A sáv címkéje kötelező").max(80),
    minEgyseg: nonNegative,
    maxEgyseg: z.coerce.number().min(0).nullable().default(null),
    alapar: nonNegative,
  })
  .refine((s) => s.maxEgyseg == null || s.maxEgyseg >= s.minEgyseg, {
    message: "A felső határ nem lehet kisebb az alsónál",
    path: ["maxEgyseg"],
  });

const szolgaltatasAlap = z.object({
  kategoriaId: z.string().min(1, "A kategória kiválasztása kötelező"),
  alkategoriaId: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined)),
  nev: z.string().trim().min(1, "A név megadása kötelező").max(200),
  leiras: optionalText(2000),
  egyseg: z.string().trim().min(1, "Az egység megadása kötelező").max(30),
  arazasiTipus: z.enum(ARAZASI_TIPUSOK),
  belsoAlapar: z.coerce.number().min(0).optional(),
  oradijKategoria: z.enum(ORADIJ_KATEGORIAK).optional(),
  egysegSavok: z.array(egysegSavSchema).default([]),
  megjegyzes: optionalText(2000),
  ugyfelMegjegyzes: optionalText(2000),
  aktiv: z.coerce.boolean().default(true),
  sorrend: z.coerce.number().int().default(0),
});

function arazasEllenorzes<T extends z.infer<typeof szolgaltatasAlap>>(
  v: T,
  ctx: z.RefinementCtx,
) {
  if (v.arazasiTipus === "fix" && v.belsoAlapar == null) {
    ctx.addIssue({
      code: "custom",
      path: ["belsoAlapar"],
      message: "Fix árhoz az alapár kötelező",
    });
  }
  if (v.arazasiTipus === "oradij" && !v.oradijKategoria) {
    ctx.addIssue({
      code: "custom",
      path: ["oradijKategoria"],
      message: "Óradíj alapú árhoz az óradíj-kategória kötelező",
    });
  }
  if (v.arazasiTipus === "egysegalapu" && v.egysegSavok.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["egysegSavok"],
      message: "Egységalapú árhoz legalább egy sáv kell",
    });
  }
}

export const szolgaltatasSchema = szolgaltatasAlap.superRefine(arazasEllenorzes);
export type SzolgaltatasInput = z.infer<typeof szolgaltatasSchema>;

export const kategoriaSchema = z.object({
  nev: z.string().trim().min(1, "A név megadása kötelező").max(100),
  kodElotag: z
    .string()
    .trim()
    .toUpperCase()
    .regex(KOD_ELOTAG_MINTA, "A kódelőtag 1–6 nagybetű/szám, betűvel kezdődik"),
  ikon: z.string().trim().max(40).default("Tag"),
  szin: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Érvénytelen szín")
    .default("#6366f1"),
  sorrend: z.coerce.number().int().default(0),
  aktiv: z.coerce.boolean().default(true),
  leiras: optionalText(500),
});
export type KategoriaInput = z.infer<typeof kategoriaSchema>;

export const alkategoriaSchema = z.object({
  kategoriaId: z.string().min(1),
  nev: z.string().trim().min(1, "A név megadása kötelező").max(100),
  sorrend: z.coerce.number().int().default(0),
  aktiv: z.coerce.boolean().default(true),
});
export type AlkategoriaInput = z.infer<typeof alkategoriaSchema>;

const tabla = <K extends readonly string[]>(kulcsok: K) =>
  z.object(
    Object.fromEntries(
      kulcsok.map((k) => [k, z.coerce.number().min(0, "Nem lehet negatív")]),
    ) as Record<K[number], z.ZodCoercedNumber>,
  );

export const arazasiBeallitasSchema = z.object({
  rezsiSzorzo: z.coerce.number().min(0.01, "Pozitív szám kell"),
  haviFixKoltseg: nonNegative,
  haviTermelekenyOrak: z.coerce.number().min(1, "Legalább 1 óra"),
  oradijak: tabla(ORADIJ_KATEGORIAK),
  ugyfelSzorzok: tabla(UGYFEL_SZORZO_KULCSOK),
  anyagPotlekok: tabla(ANYAG_POTLEK_KULCSOK),
  surgossegiSzorzok: tabla(SURGOSSEG_KULCSOK),
  afaKulcs: z.coerce.number().min(0).max(1, "Tört érték (pl. 0,27)"),
  minKiszallasiDij: nonNegative,
  minProjektDij: nonNegative,
});
export type ArazasiBeallitasInput = z.infer<typeof arazasiBeallitasSchema>;

export const priceSnapshotInputSchema = z.object({
  partnerProfil: z.object({
    szerep: z.enum(["ugyfel", "alvallalkozo_megbizo", "beszallito", "vegyes"]).nullish(),
    ugyfelKategoria: z.enum(["maganszemely", "kkv", "nagyvallalat"]).nullish(),
    szerzodesTipus: z.enum(["eseti", "6_honapos", "1_eves", "2_eves"]).nullish(),
    alvallalkozoiJelenlet: z.enum(["napi_jelenlet", "projekt", "mindketto"]).nullish(),
  }),
  surgosseg: z.enum(SURGOSSEG_KULCSOK).nullish(),
  egysegDb: z.coerce.number().min(0).optional(),
});
