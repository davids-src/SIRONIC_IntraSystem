import { z } from "zod";
import {
  SECRET_DESCRIPTION_MAX,
  SECRET_NAME_MAX,
  SECRET_VALUE_MAX,
  SHARE_KINDS,
  SHARE_LEVELS,
} from "./constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Legfeljebb ${max} karakter lehet.`)
    .optional()
    .transform((v) => (v ? v : undefined));

const name = z
  .string()
  .trim()
  .min(1, "A név kötelező.")
  .max(SECRET_NAME_MAX, `Legfeljebb ${SECRET_NAME_MAX} karakter lehet.`);

/** Opaque reference to a partner — the partner module is not imported here. */
const partnerId = z
  .string()
  .trim()
  .max(64)
  .optional()
  .transform((v) => (v ? v : undefined));

export const createSecretSchema = z.object({
  name,
  value: z
    .string()
    .min(1, "Az érték kötelező.")
    .max(SECRET_VALUE_MAX, `Legfeljebb ${SECRET_VALUE_MAX} karakter lehet.`),
  description: optionalText(SECRET_DESCRIPTION_MAX),
  partnerId,
});

/** An empty / missing value keeps the stored one — the value never travels back into the form. */
export const updateSecretSchema = z.object({
  name,
  value: z
    .string()
    .max(SECRET_VALUE_MAX, `Legfeljebb ${SECRET_VALUE_MAX} karakter lehet.`)
    .optional()
    .transform((v) => (v ? v : undefined)),
  description: optionalText(SECRET_DESCRIPTION_MAX),
  partnerId,
});

export const shareSchema = z.object({
  kind: z.enum(SHARE_KINDS),
  targetId: z.string().trim().min(1, "A címzett kötelező."),
  level: z.enum(SHARE_LEVELS).default("read"),
});

export type CreateSecretInput = z.infer<typeof createSecretSchema>;
export type UpdateSecretInput = z.infer<typeof updateSecretSchema>;
export type ShareInput = z.infer<typeof shareSchema>;
