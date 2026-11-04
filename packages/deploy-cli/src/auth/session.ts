import { loadConfig } from "../config.js";
import { loadSession, isSessionValid, type StoredSession } from "./store.js";

/** Every command but `login`/`logout` calls this first. Deliberately does not
 * auto-refresh — the CRM bridge token has no refresh grant (it's re-minted from a fresh
 * apps/auth login each time), so an expired session just means "run `login` again." */
export function requireSession(): StoredSession {
  const session = loadSession();
  if (!session || !isSessionValid(session)) {
    console.error("Not logged in (or session expired). Run: sironic-deploy login");
    process.exit(1);
  }
  return session;
}

export { loadConfig };
