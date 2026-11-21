/**
 * E-mail copies of notifications (Értesítési központ, #71). A user gets one only for the
 * categories they switched on — all off by default. Never throws: the action that triggered the
 * notification has already saved its change, and a mail server problem must not undo that.
 */
import { EMAIL_KATEGORIA_SABLON, type EmailKategoria } from "@erp/jelzes/constants";

export type { EmailKategoria };

export type EmailErtesites = {
  title: string;
  body?: string;
  /** App-relative path or absolute URL. */
  url?: string;
};

export type EmailCimzett = { id: string; email: string; nev: string };

/** What the sender needs — injected so the decision logic is testable without SMTP or Mongo. */
export type EmailFuggosegek = {
  cimzettek: (userIds: string[], kategoria: EmailKategoria) => Promise<EmailCimzett[]>;
  kuld: (opts: {
    templateKey: string;
    to: string;
    variables: Record<string, string>;
  }) => Promise<{ sent: boolean }>;
  appUrl: () => string;
};

/** Template variables are inserted into HTML as is — user-typed text must be escaped first. */
export function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** App-relative path → absolute link for the mail; absolute http(s) stays; anything else → home. */
export function abszolutLink(url: string | undefined, appUrl: string): string {
  const alap = appUrl.replace(/\/+$/, "");
  if (!url) return `${alap}/`;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/") && !url.startsWith("//")) return `${alap}${url}`;
  return `${alap}/`;
}

/**
 * Sends the category's template to every opted-in recipient, one mail each (personal greeting,
 * nobody sees the other addresses). Returns how many were sent.
 */
export async function kuldErtesitoEmailek(
  userIds: string[],
  kategoria: EmailKategoria,
  u: EmailErtesites,
  deps: EmailFuggosegek,
): Promise<number> {
  if (userIds.length === 0) return 0;
  let cimzettek: EmailCimzett[];
  try {
    cimzettek = await deps.cimzettek([...new Set(userIds)], kategoria);
  } catch (e) {
    console.error("E-mail értesítés: címzettek lekérése sikertelen", e);
    return 0;
  }
  if (cimzettek.length === 0) return 0;
  const link = htmlEscape(abszolutLink(u.url, deps.appUrl()));
  const eredmenyek = await Promise.allSettled(
    cimzettek.map((c) =>
      deps.kuld({
        templateKey: EMAIL_KATEGORIA_SABLON[kategoria],
        to: c.email,
        variables: {
          name: htmlEscape(c.nev),
          cim: htmlEscape(u.title),
          szoveg: htmlEscape(u.body ?? ""),
          link,
        },
      }),
    ),
  );
  let db = 0;
  for (const r of eredmenyek) {
    if (r.status === "fulfilled") {
      if (r.value.sent) db++;
    } else console.error("E-mail értesítés küldése sikertelen", r.reason);
  }
  return db;
}

/**
 * Which e-mail category a notification belongs to:
 * - an explicit `emailKategoria` wins (`false` = no e-mail at all);
 * - otherwise a real Jelzés (a row in the bell) is a `jelzes`;
 * - a push-only task event without an explicit category sends no e-mail (the caller knows
 *   whether it is a new task or a change — see `ertesitesEmailKategoria`).
 */
export function jelzesEmailKategoria(u: {
  emailKategoria?: EmailKategoria | false;
  jelzes?: boolean;
}): EmailKategoria | null {
  if (u.emailKategoria === false) return null;
  if (u.emailKategoria) return u.emailKategoria;
  return u.jelzes === false ? null : "jelzes";
}

/** Titles a module uses when a task / workflow step was just given to the recipient. */
const UJ_FELADAT_CIM = /^(új\b|rád osztott|rád bízt|átadt(ak|a) neked|neked adt)/i;

/**
 * A module notification (`Ertesites` from a domain facade) → e-mail category. The facade's
 * explicit `emailKategoria` wins when it sets one; otherwise a link to a task (`/feladatok…`)
 * means a task event — "new" when the title says the task became the recipient's, else a change;
 * any other link is a Jelzés.
 */
export function ertesitesEmailKategoria(e: {
  title: string;
  url?: string;
  emailKategoria?: EmailKategoria | false;
}): EmailKategoria | null {
  if (e.emailKategoria === false) return null;
  if (e.emailKategoria) return e.emailKategoria;
  if (e.url?.startsWith("/feladatok")) {
    return UJ_FELADAT_CIM.test(e.title.trim()) ? "feladat_uj" : "feladat_valtozas";
  }
  return "jelzes";
}
