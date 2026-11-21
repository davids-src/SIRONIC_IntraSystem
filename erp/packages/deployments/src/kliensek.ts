/**
 * Builds the integration clients from the stored connections. This is the only place that
 * decrypts credentials (via the shared `@erp/lib` AES-256-GCM helper) and the only place that
 * constructs real `@erp/integrations` clients — everything else (the orchestrator, the facade
 * tests) works on the structural ports.
 */
import {
  CloudflareClient,
  GithubClient,
  IntegrationError,
  NpmClient,
  PortainerClient,
} from "@erp/integrations";
import { decryptSecret } from "@erp/lib/utils";
import type { IntegracioSzolgaltato } from "./constants";
import type { IIntegracioKapcsolat } from "./models/egyeb";
import type { LepesKliensek } from "./lepesek/tipusok";

export type KapcsolatAdat = {
  szolgaltato: IntegracioSzolgaltato;
  alapUrl: string;
  hitelesito: Record<string, string>;
  meta: Record<string, unknown>;
};

/** Factory seam — the facade tests inject fakes instead of real clients. */
export type KliensGyar = (k: KapcsolatAdat) => LepesKliensek[keyof LepesKliensek];

export function kapcsolatAdat(
  row: Pick<
    IIntegracioKapcsolat,
    "szolgaltato" | "alapUrl" | "hitelesitoTitkositott" | "meta"
  >,
): KapcsolatAdat {
  return {
    szolgaltato: row.szolgaltato,
    alapUrl: row.alapUrl,
    hitelesito: JSON.parse(decryptSecret(row.hitelesitoTitkositott)) as Record<
      string,
      string
    >,
    meta: row.meta ?? {},
  };
}

export const alapKliensGyar: KliensGyar = (k) => {
  const h = k.hitelesito;
  switch (k.szolgaltato) {
    case "cloudflare":
      return new CloudflareClient({
        baseUrl: k.alapUrl,
        apiToken: h.api_token ?? "",
        accountId: k.meta.account_id as string | undefined,
      });
    case "npm":
      return new NpmClient({
        baseUrl: k.alapUrl,
        email: h.email ?? "",
        password: h.password ?? "",
        insecureTls: k.meta.allow_insecure_tls === true,
      });
    case "portainer":
      return new PortainerClient({
        baseUrl: k.alapUrl,
        apiKey: h.api_key ?? "",
        endpointId: Number(k.meta.endpoint_id ?? 1),
        insecureTls: k.meta.allow_insecure_tls === true,
      });
    case "github":
      return new GithubClient({ baseUrl: k.alapUrl, token: h.token ?? "" });
  }
};

/** First active connection per provider wins (MVP, as in the legacy CRM). */
export function kliensekEpit(
  sorok: Array<
    Pick<
      IIntegracioKapcsolat,
      "szolgaltato" | "alapUrl" | "hitelesitoTitkositott" | "meta"
    >
  >,
  gyar: KliensGyar = alapKliensGyar,
): LepesKliensek {
  const ki: Record<string, unknown> = {};
  for (const s of sorok) {
    if (ki[s.szolgaltato]) continue;
    ki[s.szolgaltato] = gyar(kapcsolatAdat(s));
  }
  return ki as LepesKliensek;
}

/** Healthcheck probe of a provider client (docs/deployments/03 §6). Never throws. */
export async function egeszsegEllenorzes(
  szolgaltato: IntegracioSzolgaltato,
  kliens: unknown,
): Promise<{ ok: boolean; uzenet: string }> {
  try {
    switch (szolgaltato) {
      case "cloudflare": {
        const r = await (kliens as CloudflareClient).verifyToken();
        return { ok: r.ok, uzenet: r.ok ? "A token érvényes." : "A token érvénytelen." };
      }
      case "npm": {
        const v = await (kliens as NpmClient).getVersion();
        return v
          ? { ok: true, uzenet: `NPM ${v.major}.${v.minor}.${v.revision}` }
          : { ok: false, uzenet: "Az NPM verziója nem állapítható meg." };
      }
      case "portainer": {
        const r = await (kliens as PortainerClient).getStatus();
        return {
          ok: r.ok,
          uzenet: r.ok ? "Portainer elérhető." : "Portainer nem válaszol.",
        };
      }
      case "github": {
        const r = await (kliens as GithubClient).getRateLimit();
        return { ok: r.ok, uzenet: r.ok ? "GitHub elérhető." : "GitHub nem válaszol." };
      }
    }
  } catch (err) {
    return {
      ok: false,
      uzenet:
        err instanceof IntegrationError ? err.safeMessage : "Az ellenőrzés sikertelen.",
    };
  }
}
