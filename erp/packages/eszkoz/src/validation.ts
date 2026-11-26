/** Zod schemas of the Eszköz Server Actions — the facade validates again. */
import { z } from "zod";
import { ESZKOZ_JEGYZET_MAX, ESZKOZ_NEV_MAX, FIZIKAI_ALLAPOTOK } from "./constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Legfeljebb ${max} karakter`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const eszkozSchema = z.object({
  megnevezes: z
    .string()
    .trim()
    .min(1, "A megnevezés kötelező")
    .max(ESZKOZ_NEV_MAX, `Legfeljebb ${ESZKOZ_NEV_MAX} karakter`),
  marka: optionalText(100),
  tipusszam: optionalText(100),
  gyariSzam: optionalText(100),
  fizikaiAllapot: z.enum(FIZIKAI_ALLAPOTOK, "Válassz fizikai állapotot"),
  jegyzet: optionalText(ESZKOZ_JEGYZET_MAX),
});
export type EszkozInput = z.infer<typeof eszkozSchema>;

export const kiadasSchema = z.object({
  celUserId: z.string().min(1, "Válaszd ki, kinek adod ki az eszközt"),
  jegyzet: optionalText(ESZKOZ_JEGYZET_MAX),
});

export const visszavetelSchema = z.object({
  fizikaiAllapot: z.enum(FIZIKAI_ALLAPOTOK, "Add meg az eszköz állapotát"),
  jegyzet: optionalText(ESZKOZ_JEGYZET_MAX),
});

export const jegyzetSchema = z.object({
  jegyzet: optionalText(ESZKOZ_JEGYZET_MAX),
});
