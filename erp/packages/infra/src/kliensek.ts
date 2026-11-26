/**
 * Builds the provider clients from the stored connections. This is the only place that decrypts
 * credentials (shared `@erp/lib` AES-256-GCM helper) and the only place that constructs real
 * `@erp/integrations` clients — the rest of the module works on the structural ports below, so the
 * tests inject fakes.
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
import type { IIntegracioKapcsolat } from "./models";
import { InfraHiba } from "./shared";

export type CloudflarePort = Pick<
  CloudflareClient,
  "listZones" | "listDnsRecords" | "upsertDnsRecord" | "deleteDnsRecord" | "verifyToken"
>;
export type NpmPort = Pick<
  NpmClient,
  | "listProxyHosts"
  | "listCertificates"
  | "createCertificate"
  | "createProxyHost"
  | "updateProxyHost"
  | "deleteProxyHost"
  | "renewCertificate"
  | "setProxyHostEnabled"
  | "getVersion"
>;
export type PortainerPort = Pick<
  PortainerClient,
  | "listStacks"
  | "getStack"
  | "createStackStandalone"
  | "updateStack"
  | "startStack"
  | "stopStack"
  | "deleteStack"
  | "getStackFile"
  | "listContainers"
  | "listImages"
  | "containerAction"
  | "pullImage"
  | "getContainerLogs"
  | "getStatus"
  | "triggerWebhook"
>;

export type InfraKliensek = {
  cloudflare?: CloudflarePort;
  npm?: NpmPort;
  portainer?: PortainerPort;
  /** The Cloudflare API token, needed by NPM's DNS-01 certificate request. */
  cloudflareToken?: string;
  /** Contact email of existing certificates — reused for new ones. */
  letsencryptEmail?: string;
};

export type KapcsolatAdat = {
  szolgaltato: IntegracioSzolgaltato;
  alapUrl: string;
  hitelesito: Record<string, string>;
  meta: Record<string, unknown>;
};

/** Factory seam — tests inject fakes instead of real clients. */
export type KliensGyar = (k: KapcsolatAdat) => unknown;

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

/** First active connection per provider wins. */
export function kliensekEpit(
  sorok: Array<
    Pick<
      IIntegracioKapcsolat,
      "szolgaltato" | "alapUrl" | "hitelesitoTitkositott" | "meta"
    >
  >,
  gyar: KliensGyar = alapKliensGyar,
): InfraKliensek {
  const ki: InfraKliensek = {};
  for (const s of sorok) {
    if (s.szolgaltato === "github") continue;
    if (ki[s.szolgaltato]) continue;
    const adat = kapcsolatAdat(s);
    ki[s.szolgaltato] = gyar(adat) as never;
    if (s.szolgaltato === "cloudflare") ki.cloudflareToken = adat.hitelesito.api_token;
  }
  return ki;
}

export function szuksegesKliens<K extends "cloudflare" | "npm" | "portainer">(
  kliensek: InfraKliensek,
  melyik: K,
): NonNullable<InfraKliensek[K]> {
  const k = kliensek[melyik];
  if (!k) {
    const nev = { cloudflare: "Cloudflare", npm: "NPM", portainer: "Portainer" }[melyik];
    throw new InfraHiba(
      `Nincs aktív ${nev} integráció — vedd fel az Integrációk oldalon.`,
    );
  }
  return k as NonNullable<InfraKliensek[K]>;
}

/** Healthcheck probe of a provider client. Never throws. */
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
      case "github":
        return { ok: true, uzenet: "A GitHub kapcsolat ebben a modulban nem használt." };
    }
  } catch (err) {
    return {
      ok: false,
      uzenet:
        err instanceof IntegrationError ? err.safeMessage : "Az ellenőrzés sikertelen.",
    };
  }
}
