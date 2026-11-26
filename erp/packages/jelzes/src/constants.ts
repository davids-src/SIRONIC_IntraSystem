/** Client-safe constants of the Jelzések (in-app notification centre, #60). */

export const JELZES_PERMISSIONS = {
  /** Körüzenet és frissítési jegyzet küldése bárkinek. */
  kuld: "jelzes:kuld",
} as const;

/**
 * - `rendszer` — an event of the system (new task, leave request, …), sent with a push;
 * - `koruzenet` — a circular someone with `jelzes:kuld` sent;
 * - `frissites` — the developer's release note ("Újdonság").
 */
export const JELZES_TIPUSOK = ["rendszer", "koruzenet", "frissites"] as const;
export type JelzesTipus = (typeof JELZES_TIPUSOK)[number];

export const JELZES_TIPUS_CIMKE: Record<JelzesTipus, string> = {
  rendszer: "Rendszer",
  koruzenet: "Körüzenet",
  frissites: "Újdonság",
};

export const JELZES_CIM_MAX = 140;
export const JELZES_SZOVEG_MAX = 4000;

/**
 * E-mail notification categories the user can opt into in the Értesítési központ (#71). All off
 * by default — the bell and the push stay the primary channel.
 * - `feladat_uj` — a task was given to me (new task, a workflow step became mine, handed to me);
 * - `feladat_valtozas` — something changed on a task of mine (state, edit, new message, mention);
 * - `jelzes` — a Jelzés (system event, körüzenet, újdonság) landed in my bell.
 */
export const EMAIL_KATEGORIAK = ["feladat_uj", "feladat_valtozas", "jelzes"] as const;
export type EmailKategoria = (typeof EMAIL_KATEGORIAK)[number];

export const EMAIL_KATEGORIA_CIMKE: Record<EmailKategoria, string> = {
  feladat_uj: "Új feladat",
  feladat_valtozas: "Feladat változása",
  jelzes: "Jelzések",
};

export const EMAIL_KATEGORIA_LEIRAS: Record<EmailKategoria, string> = {
  feladat_uj:
    "Ha feladatot kapsz: új feladat, egy folyamat következő lépése rád jutott, vagy valaki rád bízta.",
  feladat_valtozas:
    "Ha a feladataidon valami változik: állapot, határidő, módosított szöveg, új üzenet vagy megjelölés.",
  jelzes: "Ha jelzés érkezik a csengőbe: rendszerüzenetek, körüzenetek, újdonságok.",
};

/** The mail template (admin-editable, Adminisztráció → E-mail sablonok) of each category. */
export const EMAIL_KATEGORIA_SABLON: Record<EmailKategoria, string> = {
  feladat_uj: "ertesites_feladat_uj",
  feladat_valtozas: "ertesites_feladat_valtozas",
  jelzes: "ertesites_jelzes",
};

export type EmailBeallitasok = Record<EmailKategoria, boolean>;

export const EMAIL_BEALLITAS_ALAP: EmailBeallitasok = {
  feladat_uj: false,
  feladat_valtozas: false,
  jelzes: false,
};
