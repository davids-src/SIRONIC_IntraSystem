/** Zod schemas of the Telepítések Server Actions — the facade validates again where it matters. */
import { z } from "zod";
import {
  DNS_REKORD_TIPUSOK,
  INTEGRACIO_SZOLGALTATOK,
  LEJARAT_TIPUSOK,
  PROXY_SEMAK,
  SZAMLAZASI_CIKLUSOK,
} from "./constants";

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Legfeljebb ${max} karakter`)
    .optional()
    .transform((v) => (v ? v : undefined));

const optSzam = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : Number(v)))
  .pipe(z.number().finite().optional());

const DOMAIN_MINTA = /^(?=.{3,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(DOMAIN_MINTA, "Érvénytelen domain (pl. pelda.hu)");

export const stackEnvSchema = z.object({
  nev: z.string().trim().min(1).max(100),
  ertek: z.string().max(5000).optional(),
  titkos: z.boolean().optional(),
});

export const telepitesSchema = z.object({
  nev: z.string().trim().min(1, "A név kötelező").max(200),
  domain: domainSchema,
  wwwAtiranyitas: z.boolean().optional(),
  partnerId: opt(100),
  csoportId: opt(100),
  megjegyzes: opt(5000),
  dns: z
    .object({
      rekordTipus: z.enum(DNS_REKORD_TIPUSOK),
      nev: opt(253),
      cel: z.string().trim().min(1, "A DNS cél kötelező").max(253),
      proxied: z.boolean().optional(),
    })
    .optional(),
  proxy: z
    .object({
      celHost: z.string().trim().min(1).max(253),
      celPort: z.coerce.number().int().min(1).max(65535),
      celSema: z.enum(PROXY_SEMAK).optional(),
      websocket: z.boolean().optional(),
    })
    .optional(),
  image: z
    .object({
      repo: z.string().trim().min(1).max(300),
      tag: z.string().trim().min(1).max(128),
      workflowId: opt(200),
      workflowRef: opt(200),
    })
    .optional(),
  stack: z
    .object({
      nev: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .regex(/^[a-z0-9-]+$/, "Csak kisbetű, szám és kötőjel"),
      sablonId: opt(100),
      composeYaml: opt(200_000),
      env: z.array(stackEnvSchema).max(100).optional(),
    })
    .optional(),
  csomagId: opt(100),
  szamlazasiCiklus: z.enum(SZAMLAZASI_CIKLUSOK).optional(),
  arFelulirasHuf: optSzam,
});
export type TelepitesInput = z.infer<typeof telepitesSchema>;

export const lejaratSchema = z.object({
  tipus: z.enum(LEJARAT_TIPUSOK),
  cimke: z.string().trim().min(1, "A megnevezés kötelező").max(200),
  szolgaltato: opt(200),
  lejarat: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Dátum: ÉÉÉÉ-HH-NN")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  autoMegujitas: z.boolean().optional(),
  reszletek: opt(2000),
});
export type LejaratInput = z.infer<typeof lejaratSchema>;

export const archivalasSchema = z.object({
  ok: z.string().trim().min(1, "Az archiválás okát meg kell adni").max(500),
});

export const csomagSchema = z.object({
  kod: z
    .string()
    .trim()
    .min(1, "A kód kötelező")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Csak kisbetű, szám és kötőjel"),
  nev: z.string().trim().min(1, "A név kötelező").max(200),
  leiras: opt(2000),
  arHuf: z.coerce.number({ error: "Adj meg árat" }).min(0, "Az ár nem lehet negatív"),
  alapCiklus: z.enum(SZAMLAZASI_CIKLUSOK),
  vcpu: optSzam,
  ramMb: optSzam,
  diskGb: optSzam,
  savszelessegGb: optSzam,
  aktiv: z.boolean().optional(),
  sorrend: optSzam,
});
export type CsomagInput = z.infer<typeof csomagSchema>;

export const fizetesFizetveSchema = z.object({
  megjegyzes: opt(500),
  szamlaId: opt(100),
});

export const integracioSchema = z.object({
  szolgaltato: z.enum(INTEGRACIO_SZOLGALTATOK),
  cimke: z.string().trim().min(1, "A címke kötelező").max(100),
  alapUrl: z
    .string()
    .trim()
    .url("Érvénytelen URL")
    .max(500),
  /** Plain credentials as the user typed them — encrypted by the facade, never stored as is. */
  hitelesito: z.record(z.string(), z.string().max(2000)),
  allowInsecureTls: z.boolean().optional(),
  accountId: opt(100),
  endpointId: optSzam,
  aktiv: z.boolean().optional(),
});
export type IntegracioInput = z.infer<typeof integracioSchema>;

export const sablonSchema = z.object({
  nev: z.string().trim().min(1, "A név kötelező").max(200),
  leiras: opt(2000),
  alapertelmezett: z.boolean().optional(),
  composeYaml: z.string().min(1, "A compose YAML kötelező").max(200_000),
  helyorzok: z
    .array(
      z.object({
        kulcs: z
          .string()
          .trim()
          .regex(/^[A-Za-z0-9_]+$/, "Csak betű, szám és aláhúzás"),
        cimke: z.string().trim().min(1).max(200),
        kotelezo: z.boolean().optional(),
        alapertek: opt(2000),
        titkos: z.boolean().optional(),
      }),
    )
    .max(100)
    .optional(),
  szuksegesHalozatok: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
});
export type SablonInput = z.infer<typeof sablonSchema>;

export const hozzaferesSchema = z.object({
  portalFelhasznaloId: z.string().trim().min(1),
  telepitesId: z.string().trim().min(1),
  szint: z.enum(["megtekint", "kezel"]).optional(),
});
