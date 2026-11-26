import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The CLI and the MCP server talk to Mongo (stack/site records + encrypted integration
 * credentials) directly, so they need MONGODB_URI / MONGODB_DB_NAME / SECRETS_ENCRYPTION_KEY.
 * Looked up in: the process env → `--env-file` / SIRONIC_ENV_FILE → the ERP app's `.env`.
 */
export function betoltEnv(explicit?: string): string | null {
  const jelolt =
    explicit ??
    process.env.SIRONIC_ENV_FILE ??
    fileURLToPath(new URL("../../../apps/erp/.env", import.meta.url));
  if (!existsSync(jelolt)) return null;
  for (const sor of readFileSync(jelolt, "utf8").split("\n")) {
    const t = sor.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const kulcs = t.slice(0, i).trim();
    const ertek = t
      .slice(i + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2");
    if (process.env[kulcs] === undefined) process.env[kulcs] = ertek;
  }
  return jelolt;
}

export function kotelezoEnv(): void {
  const hianyzik = ["MONGODB_URI", "SECRETS_ENCRYPTION_KEY"].filter(
    (k) => !process.env[k],
  );
  if (hianyzik.length > 0) {
    throw new Error(
      `Hiányzó környezeti változó: ${hianyzik.join(", ")}. Add meg őket, vagy használd az --env-file kapcsolót (alapértelmezés: erp/apps/erp/.env).`,
    );
  }
}
