import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { CONFIG_DIR, SESSION_FILE } from "../config.js";
import type { RoleKey } from "@crm/types";

export interface StoredSession {
  access_token: string;
  /** Epoch ms — compared with a 60s skew margin before every request. */
  expires_at: number;
  email: string;
  tenantId: string;
  roleKeys: RoleKey[];
}

export function loadSession(): StoredSession | null {
  if (!existsSync(SESSION_FILE)) return null;
  try {
    return JSON.parse(readFileSync(SESSION_FILE, "utf8")) as StoredSession;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), { mode: 0o600 });
}

export function clearSession(): void {
  if (existsSync(SESSION_FILE)) unlinkSync(SESSION_FILE);
}

/** 60s skew so a token that's about to expire mid-request doesn't get used. */
export function isSessionValid(session: StoredSession): boolean {
  return session.expires_at - 60_000 > Date.now();
}
