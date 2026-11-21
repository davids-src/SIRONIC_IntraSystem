/**
 * Step handler contract and the ports the orchestrator receives. The handlers only see the
 * integration clients through these structural ports (type-only imports of `@erp/integrations`,
 * so a fake object with the same methods is enough in tests); the real clients are built
 * from the encrypted `IntegracioKapcsolat` rows in `kliensek.ts`.
 */
import type {
  CloudflareClient,
  GithubClient,
  NpmClient,
  PortainerClient,
} from "@erp/integrations";
import type { LepesAllapot, LepesKulcs } from "../constants";
import type { IKulsoIdk } from "../models/Telepites";

export type CloudflarePort = Pick<
  CloudflareClient,
  | "listZones"
  | "createZone"
  | "getZone"
  | "triggerActivationCheck"
  | "upsertDnsRecord"
  | "listDnsRecords"
>;
export type NpmPort = Pick<
  NpmClient,
  | "assertMinVersion"
  | "createCertificate"
  | "listCertificates"
  | "createProxyHost"
  | "updateProxyHost"
  | "getProxyHost"
>;
export type PortainerPort = Pick<
  PortainerClient,
  | "listStacks"
  | "createStackStandalone"
  | "updateStack"
  | "startStack"
  | "triggerWebhook"
  | "getStackFile"
  | "listContainers"
>;
export type GithubPort = Pick<
  GithubClient,
  "dispatchWorkflow" | "listWorkflowRuns" | "waitForRun"
>;

export type LepesKliensek = {
  cloudflare?: CloudflarePort;
  npm?: NpmPort;
  portainer?: PortainerPort;
  github?: GithubPort;
};

/** Read-only plain view of a Telepítés the handlers work on. */
export type TelepitesNezetAdat = {
  id: string;
  domain: string;
  wwwAtiranyitas: boolean;
  dns: { rekordTipus: "A" | "CNAME"; nev: string; cel?: string; proxied: boolean };
  proxy: {
    celHost?: string;
    celPort?: number;
    celSema: "http" | "https";
    websocket: boolean;
  };
  image: { repo?: string; tag?: string; workflowId?: string; workflowRef?: string };
  stack: { nev?: string; sablonId?: string; composeYaml?: string };
  kulsoIdk: IKulsoIdk;
  lepesek: Array<{
    kulcs: LepesKulcs;
    allapot: LepesAllapot;
    kulsoId?: string | null;
    meta?: Record<string, unknown> | null;
  }>;
};

export type RenderelhetoStack = {
  compose: string;
  /** The same render with secret values masked — safe for plans/events. */
  maszkolt: string;
  hianyzo: string[];
  halozatok: string[];
};

export type LepesKontextus = {
  telepites: TelepitesNezetAdat;
  kliensek: LepesKliensek;
  most: Date;
  /** Renders the stack compose (template placeholders + env, secrets decrypted inside). */
  stackRender: () => Promise<RenderelhetoStack>;
  /** Env vars for Portainer, secrets decrypted — only ever passed to the client, never logged. */
  stackKornyezet: () => Array<{ name: string; value: string }>;
};

export type LepesTerv = {
  osszegzes: string;
  valtoztatasok: Array<{ szolgaltato: string; muvelet: string; cel: string }>;
  figyelmeztetesek: string[];
};

export type LepesEredmeny = {
  allapot: LepesAllapot;
  kulsoId?: string | null;
  uzenet?: string;
  meta?: Record<string, unknown>;
  kulsoIdkPatch?: Partial<IKulsoIdk>;
  /** Rare: dot-path patches outside `lepesek`/`kulsoIdk`, e.g. `image.tag` on adopt. */
  telepitesPatch?: Record<string, unknown>;
};

export type LepesEllenorzes = { ok: boolean; elteresek: string[]; uzenet: string };

export type LepesInput = Record<string, unknown>;

export interface LepesKezelo {
  kulcs: LepesKulcs;
  terv(ctx: LepesKontextus, input?: LepesInput): Promise<LepesTerv>;
  vegrehajt(ctx: LepesKontextus, input?: LepesInput): Promise<LepesEredmeny>;
  adoptal(
    ctx: LepesKontextus,
    input: { kulsoId: string } & LepesInput,
  ): Promise<LepesEredmeny>;
  ellenoriz(ctx: LepesKontextus): Promise<LepesEllenorzes>;
}

/** Dependency/state problems — distinct from provider `IntegrationError`s. */
export class OrchestratorHiba extends Error {
  constructor(
    public kod: string,
    message: string,
  ) {
    super(message);
    this.name = "OrchestratorHiba";
  }
}

export function lepesAdat(t: TelepitesNezetAdat, kulcs: LepesKulcs) {
  const l = t.lepesek.find((x) => x.kulcs === kulcs);
  if (!l) {
    throw new OrchestratorHiba(
      "LEPES_NINCS",
      `A(z) "${kulcs}" lépés nem található ezen a telepítésen.`,
    );
  }
  return l;
}

export function kliens<K extends keyof LepesKliensek>(
  k: LepesKliensek,
  kulcs: K,
): NonNullable<LepesKliensek[K]> {
  const c = k[kulcs];
  if (!c) {
    throw new OrchestratorHiba(
      "INTEGRACIO_HIANYZIK",
      `Nincs beállítva aktív "${kulcs}" integrációs kapcsolat.`,
    );
  }
  return c as NonNullable<LepesKliensek[K]>;
}
