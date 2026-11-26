/**
 * Zod schemas of the Feladat Server Actions (apps/erp). The facade validates again — these give
 * the form a field-level message.
 */
import { z } from "zod";
import {
  FELADAT_CSATOLMANY_MAX,
  FELADAT_CSOPORT_MAX,
  FELADAT_LEPES_MAX,
  FELADAT_LEPES_NEV_MAX,
  FELADAT_PRIORITASOK,
} from "./constants";
import { FELADAT_KATEGORIA_MAX } from "./kategoria";

const optionalText = (max: number) => z.string().trim().max(max).optional();

/** Feladatok (7e): giving a task to a colleague, and handing a refused one to someone else. */
const feladatHatarido = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Adj meg határidőt");
const feladatFelelosId = z.string().min(1, "Válaszd ki, kinek adod a feladatot");
const feladatMediaIds = z
  .array(z.string().min(1))
  .max(FELADAT_CSATOLMANY_MAX, `Legfeljebb ${FELADAT_CSATOLMANY_MAX} csatolmány`)
  .optional();

/** Free category (#65); empty = none. */
export const feladatKategoria = z
  .string()
  .trim()
  .max(FELADAT_KATEGORIA_MAX, `A kategória legfeljebb ${FELADAT_KATEGORIA_MAX} karakter`)
  .optional();

/** Required category (#68): pick an existing one or type a new one. */
export const feladatKategoriaKotelezo = z
  .string({ error: "Adj meg kategóriát" })
  .trim()
  .min(1, "Adj meg kategóriát — válassz a korábbiakból vagy írj be újat")
  .max(FELADAT_KATEGORIA_MAX, `A kategória legfeljebb ${FELADAT_KATEGORIA_MAX} karakter`);

/** One or more recipients — several makes a group task (one copy each); your own id = own task. */
export const ujFeladatSchema = z.object({
  felelosIds: z
    .array(z.string().min(1))
    .min(1, "Válaszd ki, kinek adod a feladatot")
    .max(
      FELADAT_CSOPORT_MAX,
      `Egyszerre legfeljebb ${FELADAT_CSOPORT_MAX} embernek adhatod ki`,
    ),
  cim: z.string().trim().min(1, "Add meg röviden a feladatot").max(200),
  leiras: optionalText(2000),
  hatarido: feladatHatarido,
  prioritas: z.enum(FELADAT_PRIORITASOK).optional(),
  /** Group task: the one primary felelős among `felelosIds` (#48); the others közreműködők. */
  elsodlegesId: z.string().min(1).optional(),
  mediaIds: feladatMediaIds,
  /** Required on every task a user gives (#68) — linked tasks get their module's default. */
  kategoria: feladatKategoriaKotelezo,
});

export const feladatUjrakiadasSchema = z.object({
  felelosId: feladatFelelosId,
  hatarido: feladatHatarido,
});

export const feladatDontesSchema = z
  .object({ elfogad: z.boolean(), indok: optionalText(2000) })
  .refine((v) => v.elfogad || Boolean(v.indok), {
    message: "Írd meg, miért utasítod el",
    path: ["indok"],
  });

export const feladatMegjegyzesSchema = z
  .string()
  .trim()
  .min(1, "Írj megjegyzést")
  .max(2000);
export const feladatMegjegyzesMediaSchema = feladatMediaIds;

/** The kiadó changes deadline and / or priority (8m) — of the whole group unless `csakEz`. */
export const feladatModositasSchema = z
  .object({
    hatarido: feladatHatarido.optional(),
    prioritas: z.enum(FELADAT_PRIORITASOK).optional(),
    csakEz: z.boolean().optional(),
    /** A task keeps a category once it has one (#68) — it can be changed, not cleared. */
    kategoria: feladatKategoriaKotelezo.optional(),
  })
  .refine((v) => v.hatarido || v.prioritas || v.kategoria !== undefined, {
    message: "Nincs mit módosítani",
  });

/** The kiadó corrects or completes the task's text (#68) — on every copy of a group. */
export const feladatSzovegSchema = z
  .object({
    cim: z.string().trim().min(1, "Add meg röviden a feladatot").max(200).optional(),
    leiras: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.cim !== undefined || v.leiras !== undefined, {
    message: "Nincs mit módosítani",
  });

/** A chat message (#68): text up to 2000, optional reply target and attachments. */
export const feladatUzenetSchema = z.object({
  szoveg: z.string().trim().min(1, "Írj üzenetet").max(2000, "Legfeljebb 2000 karakter"),
  valaszId: z.string().min(1).optional(),
  mediaIds: feladatMediaIds,
});

export const feladatUzenetModositasSchema = z
  .string()
  .trim()
  .min(1, "Az üzenet nem lehet üres — töröld, ha nem kell")
  .max(2000, "Legfeljebb 2000 karakter");

/** New members of a group task (8m). */
export const csoporttagokSchema = z
  .array(z.string().min(1))
  .min(1, "Válaszd ki, kit adsz hozzá")
  .max(
    FELADAT_CSOPORT_MAX,
    `Egyszerre legfeljebb ${FELADAT_CSOPORT_MAX} embert adhatsz hozzá`,
  );

/** Továbbadás (#49): to the kiadó or anyone else, always with a reason. */
export const feladatTovabbadasSchema = z.object({
  celId: z.string().min(1, "Válaszd ki, kinek adod tovább"),
  indok: z.string().trim().min(1, "Írd meg, miért adod tovább").max(2000),
});

/** Steps of a task (#50): the felelős defines, edits and ticks them. */
export const feladatLepesSchema = z.object({
  nev: z.string().trim().min(1, "Add meg a lépés nevét").max(FELADAT_LEPES_NEV_MAX),
  kesz: z.boolean().default(false),
  hatarido: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Érvénytelen határidő")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const feladatLepesekSchema = z
  .array(feladatLepesSchema)
  .max(FELADAT_LEPES_MAX, `Legfeljebb ${FELADAT_LEPES_MAX} lépés`);

/** A personal step template: a name and the step names. */
export const lepesSablonSchema = z.object({
  nev: z.string().trim().min(1, "Add meg a sablon nevét").max(100),
  lepesek: z
    .array(z.string().trim().min(1).max(FELADAT_LEPES_NEV_MAX))
    .min(1, "Legalább egy lépés kell")
    .max(FELADAT_LEPES_MAX),
});

// Feladat-folyamat (#67).
export * from "./folyamat-validation";
