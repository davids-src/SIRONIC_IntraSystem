import { z } from "zod";
import { JELZES_CIM_MAX, JELZES_SZOVEG_MAX } from "./constants";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Érvénytelen azonosító");

/** Who a körüzenet goes to — any combination; `mindenki` overrides the rest. */
export const jelzesCimzettekSchema = z.object({
  mindenki: z.boolean().default(false),
  userIds: z.array(objectId).max(1000).default([]),
  roleIds: z.array(objectId).max(200).default([]),
  permissionKeys: z.array(z.string().min(1).max(100)).max(200).default([]),
});
export type JelzesCimzettek = z.infer<typeof jelzesCimzettekSchema>;

/** App-relative path, or an absolute https link. */
const linkSchema = z
  .string()
  .trim()
  .max(500)
  .refine((s) => s === "" || /^\/(?!\/)/.test(s) || /^https:\/\/[^\s]+$/.test(s), {
    message: "A link „/”-rel kezdődő oldal vagy https:// cím lehet.",
  });

export const koruzenetSchema = z.object({
  tipus: z.enum(["koruzenet", "frissites"]),
  cim: z.string().trim().min(1, "A cím kötelező").max(JELZES_CIM_MAX),
  szoveg: z.string().trim().max(JELZES_SZOVEG_MAX).default(""),
  url: linkSchema.default(""),
  push: z.boolean().default(false),
  cimzettek: jelzesCimzettekSchema,
});
export type KoruzenetInput = z.infer<typeof koruzenetSchema>;
