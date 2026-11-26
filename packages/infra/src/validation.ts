import { z } from "zod";
import {
  DNS_TIPUSOK,
  HOZZAFERES_TIPUSOK,
  INTEGRACIO_SZOLGALTATOK,
  OLDAL_SEMAK,
  STACK_TIPUSOK,
  WEBHELY_TIPUSOK,
} from "./constants";

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const integracioSchema = z.object({
  szolgaltato: z.enum(INTEGRACIO_SZOLGALTATOK),
  cimke: z.string().trim().min(1, "A címke kötelező").max(100),
  alapUrl: z.string().trim().url("Érvénytelen URL").max(500),
  /** Plain credentials as the user typed them — encrypted by the facade, never stored as is. */
  hitelesito: z.record(z.string(), z.string().max(2000)),
  allowInsecureTls: z.boolean().optional(),
  accountId: opt(100),
  endpointId: z.number().int().positive().optional(),
  aktiv: z.boolean().optional(),
});
export type IntegracioInput = z.input<typeof integracioSchema>;

const envSor = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Érvénytelen változónév"),
  value: z.string().max(10_000),
});

export const stackUjSchema = z.object({
  nev: z
    .string()
    .trim()
    .min(2, "A név kötelező")
    .max(63)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Csak kisbetű, szám, kötőjel és alávonás"),
  compose: z.string().min(1, "A compose fájl kötelező").max(200_000),
  env: z.array(envSor).max(500).optional(),
  tipus: z.enum(STACK_TIPUSOK).optional(),
  partnerId: opt(40),
  leiras: opt(500),
});
export type StackUjInput = z.input<typeof stackUjSchema>;

export const oldalSchema = z.object({
  nev: z.string().trim().max(120).optional(),
  /** Main hostname first, aliases after (e.g. the www. variant). */
  hostnevek: z
    .array(z.string().trim().min(3))
    .min(1, "Legalább egy hostnév kell")
    .max(10),
  stackId: opt(40),
  szolgaltatas: z.string().trim().min(1, "A szolgáltatás (konténer) kötelező").max(120),
  port: z.number().int().min(1).max(65535),
  sema: z.enum(OLDAL_SEMAK).optional(),
  websocket: z.boolean().optional(),
  sslKikenyszer: z.boolean().optional(),
  partnerId: opt(40),
  megjegyzes: opt(500),
  dns: z
    .object({
      tipus: z.enum(DNS_TIPUSOK),
      cel: z.string().trim().min(1).max(253),
      proxied: z.boolean().optional(),
    })
    .optional(),
  letsencryptEmail: z.string().trim().email().optional(),
});
export type OldalInput = z.input<typeof oldalSchema>;

export const sablonSchema = z.object({
  nev: z.string().trim().min(2, "A név kötelező").max(80),
  leiras: opt(500),
  tipus: z.enum(STACK_TIPUSOK).optional(),
  compose: z.string().min(1, "A compose fájl kötelező").max(200_000),
  env: z.array(envSor).max(500).optional(),
});
export type SablonInput = z.input<typeof sablonSchema>;

export const webhelySchema = z.object({
  nev: z.string().trim().min(1, "A név kötelező").max(120),
  tipus: z.enum(WEBHELY_TIPUSOK).optional(),
  hostnevek: z
    .array(z.string().trim().min(3))
    .min(1, "Legalább egy hostnév kell")
    .max(10),
  partnerId: opt(40),
  tarhely: opt(200),
  lejarat: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), "Érvénytelen dátum"),
  megjegyzes: opt(1000),
});
export type WebhelyInput = z.input<typeof webhelySchema>;

export const hozzaferesSchema = z.object({
  tipus: z.enum(HOZZAFERES_TIPUSOK).optional(),
  cimke: z.string().trim().min(1, "A címke kötelező").max(100),
  host: z.string().trim().min(1, "A host kötelező").max(253),
  port: z.number().int().min(1).max(65535).optional(),
  felhasznalo: opt(200),
  /** Plain password as typed — encrypted by the facade. `undefined` keeps the stored one on edit. */
  jelszo: z.string().max(1000).optional(),
  konyvtar: opt(300),
  url: opt(500),
  megjegyzes: opt(1000),
});
export type HozzaferesInput = z.input<typeof hozzaferesSchema>;
