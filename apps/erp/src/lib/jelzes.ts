/**
 * The one way the app notifies people (#60): every notification is an in-app Jelzés (the bell)
 * and — unless switched off — a Web Push to the recipients' devices, plus an e-mail copy for
 * whoever opted into that category (#71). The Jelzés is written first,
 * so a failed or blocked push loses nothing. Never throws: the action that triggered it has
 * already saved its change.
 *
 * Domain packages do not import this — the app's actions call it after a facade returns who to
 * notify (keeps `@erp/jelzes` out of the domain DAG).
 */
import { jelzesApi, type JelzesTipus } from "@erp/jelzes";
import { getAppUrl, sendTemplatedEmail } from "@erp/mail";
import {
  jelzesEmailKategoria,
  kuldErtesitoEmailek,
  type EmailFuggosegek,
  type EmailKategoria,
} from "./ertesites-email";
import { sendPush, type PushUzenet } from "./push";

export type JelzesUzenet = PushUzenet & {
  tipus?: JelzesTipus;
  kuldo?: { id: string; nev?: string };
  /** For the "Elküldött jelzések" list (körüzenet). */
  cimzettLeiras?: string;
  /** `false`: only the in-app Jelzés, no push. Default `true`. */
  push?: boolean;
  /**
   * `false`: push only, no Jelzés row. Task events use this — they live on the Feladatok page
   * and its sidebar count, and would otherwise flood the Jelzések (client feedback 2026-11-19).
   */
  jelzes?: boolean;
  /**
   * E-mail copy for the recipients who switched this category on in the Értesítési központ
   * (#71, all off by default). Omitted: a real Jelzés (`jelzes` not `false`) counts as
   * `'jelzes'`; a push-only task event sends no e-mail unless the caller names
   * `'feladat_uj'` / `'feladat_valtozas'`. `false`: never an e-mail.
   */
  emailKategoria?: EmailKategoria | false;
};

const emailFuggosegek: EmailFuggosegek = {
  cimzettek: (userIds, kategoria) => jelzesApi.emailCimzettek(userIds, kategoria),
  kuld: (o) => sendTemplatedEmail({ ...o, skipTemplateRecipients: true }),
  appUrl: getAppUrl,
};

async function emailMasolat(userIds: string[], u: JelzesUzenet): Promise<void> {
  const kategoria = jelzesEmailKategoria(u);
  if (!kategoria) return;
  try {
    await kuldErtesitoEmailek(userIds, kategoria, u, emailFuggosegek);
  } catch (e) {
    console.error("E-mail értesítés sikertelen", e);
  }
}

/** Returns how many devices accepted the push (0 when push is off or nobody subscribed). */
export async function jelzesKuld(userIds: string[], u: JelzesUzenet): Promise<number> {
  const push = u.push ?? true;
  if (u.jelzes === false) {
    const db = push
      ? await sendPush(userIds, { title: u.title, body: u.body, url: u.url, tag: u.tag })
      : 0;
    await emailMasolat(userIds, u);
    return db;
  }
  try {
    await jelzesApi.letrehoz(userIds, {
      cim: u.title,
      szoveg: u.body,
      url: u.url,
      tipus: u.tipus ?? "rendszer",
      kuldoId: u.kuldo?.id,
      kuldoNev: u.kuldo?.nev,
      cimzettLeiras: u.cimzettLeiras,
      push,
    });
  } catch (e) {
    console.error("Jelzés mentése sikertelen", e);
  }
  const db = push
    ? await sendPush(userIds, { title: u.title, body: u.body, url: u.url, tag: u.tag })
    : 0;
  await emailMasolat(userIds, u);
  return db;
}
