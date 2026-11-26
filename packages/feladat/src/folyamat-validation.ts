/**
 * Zod schemas of the Feladat-folyamat Server Actions (#67). The facade validates again.
 */
import { z } from "zod";
import { FELADAT_PRIORITASOK } from "./constants";
import { FOLYAMAT_LEPES_MAX } from "./folyamat";

const nap = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const folyamatLepesSchema = z.object({
  id: z.string().optional(),
  nev: z.string().max(200),
  felelosId: z.string(),
  hatarido: nap,
});

export const folyamatLepesekSchema = z.array(folyamatLepesSchema).max(FOLYAMAT_LEPES_MAX);

export const ujFolyamatSchema = z.object({
  cim: z.string().trim().min(1, "Add meg röviden a feladatot").max(200),
  leiras: z.string().max(2000).optional(),
  hatarido: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Add meg a folyamat határidejét"),
  prioritas: z.enum(FELADAT_PRIORITASOK).optional(),
  kategoria: z.string().max(60).optional(),
  lepesek: z
    .array(folyamatLepesSchema)
    .min(1, "Adj meg legalább egy lépést")
    .max(FOLYAMAT_LEPES_MAX),
  /** An existing task of the kiadó becomes step 1. */
  feladatId: z.string().optional(),
});

export type UjFolyamatInput = z.input<typeof ujFolyamatSchema>;
export type FolyamatLepesSorInput = z.input<typeof folyamatLepesSchema>;
