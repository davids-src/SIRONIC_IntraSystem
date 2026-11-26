/**
 * The single tool registry behind both the CLI (`sironic-infra <group> <action>`) and the MCP
 * server. Every tool is a thin call into the `@erp/infra` facade — no business logic lives here.
 *
 * Safety defaults for agents:
 *  - compose text and env values are MASKED unless `reveal` is passed (inline secrets are common);
 *  - a masked compose can never be written back (`stack_update` refuses the placeholder);
 *  - destructive tools need an explicit confirmation argument (`confirm_name` / `confirm_host`).
 */
import { connectDB } from "@erp/db-core";
import { infraApi, type InfraResult } from "@erp/infra";
import { partnerApi } from "@erp/partner";

export type ParamType = "string" | "number" | "boolean" | "string[]";
export type Param = {
  type: ParamType;
  description: string;
  required?: boolean;
  enum?: readonly string[];
  /** The CLI fills this from the first bare argument (`stack get sakkmed`). */
  positional?: boolean;
};
export type Args = Record<string, unknown>;
export type ToolCtx = { szereplo: string };
export type Tool = {
  name: string;
  description: string;
  params: Record<string, Param>;
  readOnly?: boolean;
  destructive?: boolean;
  run(args: Args, ctx: ToolCtx): Promise<unknown>;
};

export const MASK = "***MASKED***";
const TITKOS_KULCS =
  /(pass|secret|key|token|pwd|auth|uri|dsn|credential|private|salt|cert)/i;

/** Masks values of secret-looking keys in compose YAML (`KEY: value` / `- KEY=value`). */
export function maszkolCompose(szoveg: string): string {
  return szoveg
    .split("\n")
    .map((sor) => {
      const m = sor.match(
        /^(\s*(?:-\s*)?["']?)([A-Za-z_][A-Za-z0-9_.-]*)(["']?\s*[:=]\s*)(.+)$/,
      );
      if (!m || !TITKOS_KULCS.test(m[2]!)) return sor;
      if (m[4]!.trim() === "" || m[4]!.trim() === ">-" || m[4]!.trim() === "|")
        return sor;
      return `${m[1]}${m[2]}${m[3]}${MASK}`;
    })
    .join("\n");
}

export function maszkolEnv(
  env: Array<{ name: string; value: string }>,
): Array<{ name: string; value: string }> {
  return env.map((e) => ({
    name: e.name,
    value: TITKOS_KULCS.test(e.name) ? MASK : e.value,
  }));
}

function siker<T extends object>(r: InfraResult<T>): T & { ok: true } {
  if (!r.ok) throw new Error(r.message);
  return r as T & { ok: true };
}

const str = (a: Args, k: string): string | undefined => {
  const v = a[k];
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
};
const kotelezo = (a: Args, k: string): string => {
  const v = str(a, k);
  if (!v) throw new Error(`Hiányzó paraméter: ${k}`);
  return v;
};
const szam = (a: Args, k: string): number | undefined => {
  const v = a[k];
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`A(z) ${k} paraméter nem szám.`);
  return n;
};
const lista = (a: Args, k: string): string[] | undefined => {
  const v = a[k];
  if (v === undefined) return undefined;
  const t = Array.isArray(v) ? v.map(String) : String(v).split(",");
  return t.map((s) => s.trim()).filter(Boolean);
};

/** Partner by id or by (unique, case-insensitive, partial) name. */
async function partnerAzonosit(ref: string): Promise<string> {
  await connectDB();
  const opciok = await partnerApi.listPartnerOptions();
  const pontos = opciok.find((o) => o.id === ref);
  if (pontos) return pontos.id;
  const q = ref.toLowerCase();
  const talalat = opciok.filter((o) => o.nev.toLowerCase().includes(q));
  const egyezo = talalat.filter((o) => o.nev.toLowerCase() === q);
  const jelolt = egyezo.length === 1 ? egyezo : talalat;
  if (jelolt.length === 1) return jelolt[0]!.id;
  if (jelolt.length === 0) throw new Error(`Nincs „${ref}” nevű partner.`);
  throw new Error(
    `Több partner is egyezik (${jelolt.map((o) => o.nev).join("; ")}) — pontosítsd.`,
  );
}

const STACK = {
  type: "string",
  description: "Stack: id, Portainer id or name.",
  required: true,
  positional: true,
} as const;
const WEB_PARAM = {
  web: {
    type: "string",
    description: "Website: id, name or any of its hostnames.",
    required: true,
    positional: true,
  },
} as const;
const OLDAL = {
  type: "string",
  description: "Site: id or any of its hostnames.",
  required: true,
  positional: true,
} as const;

function envSorok(a: Args): Array<{ name: string; value: string }> | undefined {
  const l = lista(a, "env");
  if (!l) return undefined;
  return l.map((s) => {
    const i = s.indexOf("=");
    if (i < 1) throw new Error(`Az env sor formátuma NEV=érték: "${s}".`);
    return { name: s.slice(0, i), value: s.slice(i + 1) };
  });
}

export const TOOLS: Tool[] = [
  {
    name: "overview",
    description:
      "Live health overview: stack and container counts, problem containers, certificates expiring soon, provider connection status. Start here.",
    readOnly: true,
    params: {},
    run: () => infraApi.attekintes(),
  },
  {
    name: "sync",
    description:
      "Discover everything from Portainer, Nginx Proxy Manager and Cloudflare and update the stack/site records (non-destructive; keeps partner and notes).",
    params: {},
    run: async (_a, c) => siker(await infraApi.szinkron(c.szereplo)),
  },
  {
    name: "stack_list",
    description:
      "List stacks (one Portainer stack = one project/service with several images) with live state, images and site counts. Also lists containers that belong to no stack.",
    readOnly: true,
    params: {},
    run: () => infraApi.listStackek(),
  },
  {
    name: "stack_get",
    description:
      "One stack in detail: containers (image, state, ports), attached sites, partner.",
    readOnly: true,
    params: { stack: STACK },
    run: async (a) => {
      const d = await infraApi.getStack(
        await infraApi.stackAzonosit(kotelezo(a, "stack")),
      );
      if (!d) throw new Error("A stack nem található.");
      return d;
    },
  },
  {
    name: "stack_compose",
    description:
      "The stack's compose file and env. Secret-looking values are masked unless reveal=true. A masked text cannot be written back.",
    readOnly: true,
    params: {
      stack: STACK,
      reveal: {
        type: "boolean",
        description: "Show secret values (only when you truly need them).",
      },
    },
    run: async (a) => {
      const f = await infraApi.getStackFajl(
        await infraApi.stackAzonosit(kotelezo(a, "stack")),
      );
      return a.reveal === true
        ? f
        : { compose: maszkolCompose(f.compose), env: maszkolEnv(f.env), masked: true };
    },
  },
  {
    name: "stack_logs",
    description: "Recent log lines of one container of the stack.",
    readOnly: true,
    params: {
      stack: STACK,
      container: {
        type: "string",
        description: "Container name or compose service name.",
        required: true,
      },
      tail: { type: "number", description: "Number of lines (default 200, max 2000)." },
    },
    run: async (a) => ({
      log: await infraApi.stackNaplo(
        await infraApi.stackAzonosit(kotelezo(a, "stack")),
        kotelezo(a, "container"),
        szam(a, "tail") ?? 200,
      ),
    }),
  },
  {
    name: "stack_pull",
    description:
      "Re-pull the images of the stack (or of ONE service with `service`) and recreate only the containers whose image changed. Env is preserved.",
    params: {
      stack: STACK,
      service: {
        type: "string",
        description: "Container/service name: re-pull only this one.",
      },
    },
    run: async (a, c) => {
      const id = await infraApi.stackAzonosit(kotelezo(a, "stack"));
      const sv = typeof a.service === "string" ? a.service.trim() : "";
      return siker(
        sv
          ? await infraApi.konteinerFrissit(id, sv, c.szereplo)
          : await infraApi.frissitStack(id, c.szereplo),
      );
    },
  },
  {
    name: "stack_set_image",
    description:
      "Change the image (e.g. a new tag) of one compose service, keeping comments, then redeploy (pulls by default).",
    params: {
      stack: STACK,
      service: { type: "string", description: "Compose service key.", required: true },
      image: {
        type: "string",
        description: "Full image reference, e.g. ghcr.io/org/app:v2.",
        required: true,
      },
      pull: {
        type: "boolean",
        description: "Pull fresh images while redeploying (default true).",
      },
    },
    run: async (a, c) =>
      siker(
        await infraApi.imageBeallit(
          await infraApi.stackAzonosit(kotelezo(a, "stack")),
          kotelezo(a, "service"),
          kotelezo(a, "image"),
          { pull: a.pull !== false },
          c.szereplo,
        ),
      ),
  },
  {
    name: "stack_env_set",
    description: "Set one stack environment variable (Portainer env) and redeploy.",
    params: {
      stack: STACK,
      name: { type: "string", description: "Variable name.", required: true },
      value: { type: "string", description: "Value.", required: true },
    },
    run: async (a, c) =>
      siker(
        await infraApi.envBeallit(
          await infraApi.stackAzonosit(kotelezo(a, "stack")),
          kotelezo(a, "name"),
          typeof a.value === "string" ? a.value : "",
          c.szereplo,
        ),
      ),
  },
  {
    name: "stack_env_unset",
    description: "Remove one stack environment variable and redeploy.",
    params: {
      stack: STACK,
      name: { type: "string", description: "Variable name.", required: true },
    },
    run: async (a, c) =>
      siker(
        await infraApi.envBeallit(
          await infraApi.stackAzonosit(kotelezo(a, "stack")),
          kotelezo(a, "name"),
          null,
          c.szereplo,
        ),
      ),
  },
  {
    name: "stack_update",
    description:
      "Replace the compose file (and optionally the env) of a stack and redeploy. Read the current compose with reveal=true first; text containing the mask placeholder is refused. Prefer stack_set_image / stack_env_set for small changes.",
    params: {
      stack: STACK,
      compose: { type: "string", description: "Complete new compose YAML." },
      env: {
        type: "string[]",
        description: "Complete env list as NAME=value (replaces the current one).",
      },
      pull: { type: "boolean", description: "Pull fresh images while redeploying." },
    },
    run: async (a, c) => {
      const compose = str(a, "compose");
      if (compose?.includes(MASK))
        throw new Error(
          "A compose maszkolt értékeket tartalmaz — olvasd ki újra reveal=true-val, és abból szerkessz.",
        );
      if (!compose && !envSorok(a)) throw new Error("Adj meg compose-t és/vagy env-et.");
      return siker(
        await infraApi.mentesStack(
          await infraApi.stackAzonosit(kotelezo(a, "stack")),
          { compose, env: envSorok(a), pull: a.pull === true },
          c.szereplo,
        ),
      );
    },
  },
  {
    name: "stack_start",
    description: "Start a stopped stack, or only one container of it with `container`.",
    params: {
      stack: STACK,
      container: {
        type: "string",
        description: "Container/service name: start only this one.",
      },
    },
    run: async (a, c) => {
      const id = await infraApi.stackAzonosit(kotelezo(a, "stack"));
      const k = typeof a.container === "string" ? a.container.trim() : "";
      return siker(
        k
          ? await infraApi.konteinerInditas(id, k, c.szereplo)
          : await infraApi.inditStack(id, c.szereplo),
      );
    },
  },
  {
    name: "stack_stop",
    description:
      "Stop every container of the stack (sites go down), or only one container with `container`.",
    destructive: true,
    params: {
      stack: STACK,
      container: {
        type: "string",
        description: "Container/service name: stop only this one.",
      },
    },
    run: async (a, c) => {
      const id = await infraApi.stackAzonosit(kotelezo(a, "stack"));
      const k = typeof a.container === "string" ? a.container.trim() : "";
      return siker(
        k
          ? await infraApi.konteinerLeallitas(id, k, c.szereplo)
          : await infraApi.leallitStack(id, c.szereplo),
      );
    },
  },
  {
    name: "stack_restart",
    description: "Restart one container of the stack.",
    params: {
      stack: STACK,
      container: {
        type: "string",
        description: "Container name or compose service name.",
        required: true,
      },
    },
    run: async (a, c) =>
      siker(
        await infraApi.konteinerUjraindit(
          await infraApi.stackAzonosit(kotelezo(a, "stack")),
          kotelezo(a, "container"),
          c.szereplo,
        ),
      ),
  },
  {
    name: "stack_create",
    description: "Create and start a new stack on Portainer from a compose file.",
    params: {
      name: {
        type: "string",
        description: "Stack name (lowercase, digits, - and _).",
        required: true,
        positional: true,
      },
      compose: {
        type: "string",
        description: "Compose YAML (omit when `template` is given).",
      },
      template: {
        type: "string",
        description:
          "Stack template (id or name) to start from; explicit compose/env/type override it.",
      },
      env: {
        type: "string[]",
        description: "Env as NAME=value (added to / overriding the template's).",
      },
      type: {
        type: "string",
        description: "Stack type.",
        enum: ["projekt", "szolgaltatas", "rendszer"],
      },
      partner: { type: "string", description: "Partner id or name." },
      description: { type: "string", description: "Short description." },
    },
    run: async (a, c) => {
      const sablon = str(a, "template")
        ? await infraApi.getSablon(await infraApi.sablonAzonosit(kotelezo(a, "template")))
        : null;
      const compose = str(a, "compose") ?? sablon?.compose;
      if (!compose) throw new Error("Adj meg compose-t vagy sablont (template).");
      const sajat = envSorok(a) ?? [];
      const env = new Map((sablon?.env ?? []).map((e) => [e.name, e.value]));
      for (const e of sajat) env.set(e.name, e.value);
      return siker(
        await infraApi.ujStack(
          {
            nev: kotelezo(a, "name"),
            compose,
            env: [...env].map(([name, value]) => ({ name, value })),
            tipus: (str(a, "type") ?? sablon?.tipus) as
              "projekt" | "szolgaltatas" | "rendszer" | undefined,
            partnerId: str(a, "partner")
              ? await partnerAzonosit(kotelezo(a, "partner"))
              : undefined,
            leiras: str(a, "description") ?? sablon?.leiras,
          },
          c.szereplo,
        ),
      );
    },
  },
  {
    name: "stack_set",
    description:
      'Set a stack\'s type, partner or description (CRM record only; nothing changes on Portainer). Use partner="" to clear.',
    params: {
      stack: STACK,
      type: {
        type: "string",
        description: "Stack type.",
        enum: ["projekt", "szolgaltatas", "rendszer"],
      },
      partner: {
        type: "string",
        description: "Partner id or name; empty string clears it.",
      },
      description: { type: "string", description: "Description." },
    },
    run: async (a) => {
      const partner =
        a.partner === undefined
          ? undefined
          : a.partner === ""
            ? null
            : await partnerAzonosit(String(a.partner));
      return siker(
        await infraApi.stackModosit(await infraApi.stackAzonosit(kotelezo(a, "stack")), {
          tipus: str(a, "type") as "projekt" | "szolgaltatas" | "rendszer" | undefined,
          partnerId: partner,
          leiras: typeof a.description === "string" ? a.description : undefined,
        }),
      );
    },
  },
  {
    name: "stack_delete",
    description:
      "Permanently delete a stack from Portainer. Refused while sites still point at it. Needs confirm_name = the stack name.",
    destructive: true,
    params: {
      stack: STACK,
      confirm_name: {
        type: "string",
        description: "Type the stack name to confirm.",
        required: true,
      },
    },
    run: async (a, c) =>
      siker(
        await infraApi.torolStack(
          await infraApi.stackAzonosit(kotelezo(a, "stack")),
          kotelezo(a, "confirm_name"),
          c.szereplo,
        ),
      ),
  },
  {
    name: "site_list",
    description:
      "List sites (hostname → stack service). Filter by stack, partner or a search text.",
    readOnly: true,
    params: {
      stack: { type: "string", description: "Only sites of this stack." },
      partner: {
        type: "string",
        description: "Only sites of this partner (id or name).",
      },
      search: { type: "string", description: "Hostname / name / service contains." },
    },
    run: async (a) =>
      infraApi.listOldalak({
        stackId: str(a, "stack")
          ? await infraApi.stackAzonosit(kotelezo(a, "stack"))
          : undefined,
        partnerId: str(a, "partner")
          ? await partnerAzonosit(kotelezo(a, "partner"))
          : undefined,
        kereses: str(a, "search"),
      }),
  },
  {
    name: "site_get",
    description:
      "One site in detail: hostnames, target service and port, stack, partner, DNS and provider ids.",
    readOnly: true,
    params: { site: OLDAL },
    run: async (a) => {
      const o = await infraApi.getOldal(
        await infraApi.oldalAzonosit(kotelezo(a, "site")),
      );
      if (!o) throw new Error("Az oldal nem található.");
      return o;
    },
  },
  {
    name: "site_check",
    description:
      "Read-only health check of a site: DNS, proxy host, SSL expiry, container state and a live HTTPS probe.",
    readOnly: true,
    params: { site: OLDAL },
    run: async (a) =>
      infraApi.ellenorizOldal(await infraApi.oldalAzonosit(kotelezo(a, "site"))),
  },
  {
    name: "site_create",
    description:
      "Publish a site: Cloudflare DNS record → Let's Encrypt certificate (DNS-01, an existing covering cert is reused) → NPM proxy host. Idempotent; safe to re-run after a failed step.",
    params: {
      hosts: {
        type: "string[]",
        description: "Hostnames; first is the main one, e.g. example.hu,www.example.hu.",
        required: true,
      },
      stack: {
        type: "string",
        description: "Stack the service belongs to (omit for an external target).",
      },
      service: {
        type: "string",
        description:
          "Container/service name inside the stack (or host/IP for an external target).",
        required: true,
      },
      port: { type: "number", description: "Container port.", required: true },
      scheme: {
        type: "string",
        description: "Upstream scheme.",
        enum: ["http", "https"],
      },
      partner: {
        type: "string",
        description: "Partner id or name (defaults to the stack's partner).",
      },
      name: { type: "string", description: "Display name (default: main hostname)." },
      dns_type: {
        type: "string",
        description: "DNS record type (default: most used by existing sites).",
        enum: ["A", "CNAME"],
      },
      dns_target: { type: "string", description: "DNS record target (IP or hostname)." },
      dns_proxied: { type: "boolean", description: "Cloudflare proxy (orange cloud)." },
      email: {
        type: "string",
        description:
          "Let's Encrypt contact email, only when a new certificate is needed and none exists yet.",
      },
    },
    run: async (a, c) => {
      const dnsTipus = str(a, "dns_type") as "A" | "CNAME" | undefined;
      const r = await infraApi.ujOldal(
        {
          hostnevek: lista(a, "hosts") ?? [],
          stackId: str(a, "stack")
            ? await infraApi.stackAzonosit(kotelezo(a, "stack"))
            : undefined,
          szolgaltatas: kotelezo(a, "service"),
          port: szam(a, "port") ?? 0,
          sema: str(a, "scheme") as "http" | "https" | undefined,
          partnerId: str(a, "partner")
            ? await partnerAzonosit(kotelezo(a, "partner"))
            : undefined,
          nev: str(a, "name"),
          dns:
            dnsTipus && str(a, "dns_target")
              ? {
                  tipus: dnsTipus,
                  cel: kotelezo(a, "dns_target"),
                  proxied: a.dns_proxied !== false,
                }
              : undefined,
          letsencryptEmail: str(a, "email"),
        },
        c.szereplo,
      );
      if (!r.ok)
        throw new Error(
          `${r.message}\n${r.lepesek.map((l) => `${l.ok ? "✓" : "✗"} ${l.kulcs}: ${l.uzenet}`).join("\n")}`,
        );
      return r;
    },
  },
  {
    name: "site_update",
    description:
      'Change a site. Target-only changes (service/port/scheme/stack) touch just the proxy host; changing hosts re-runs DNS + SSL. partner="" clears the partner.',
    params: {
      site: OLDAL,
      hosts: { type: "string[]", description: "New full hostname list." },
      stack: { type: "string", description: "Move to this stack." },
      service: { type: "string", description: "New service/container name." },
      port: { type: "number", description: "New port." },
      scheme: {
        type: "string",
        description: "Upstream scheme.",
        enum: ["http", "https"],
      },
      partner: {
        type: "string",
        description: "Partner id or name; empty string clears it.",
      },
      name: { type: "string", description: "Display name." },
      notes: { type: "string", description: "Notes." },
      websocket: { type: "boolean", description: "Allow websocket upgrade." },
      force_ssl: { type: "boolean", description: "Redirect HTTP to HTTPS." },
    },
    run: async (a, c) => {
      const r = await infraApi.modositOldal(
        await infraApi.oldalAzonosit(kotelezo(a, "site")),
        {
          hostnevek: lista(a, "hosts"),
          stackId: str(a, "stack")
            ? await infraApi.stackAzonosit(kotelezo(a, "stack"))
            : undefined,
          szolgaltatas: str(a, "service"),
          port: szam(a, "port"),
          sema: str(a, "scheme") as "http" | "https" | undefined,
          partnerId:
            a.partner === undefined
              ? undefined
              : a.partner === ""
                ? ""
                : await partnerAzonosit(String(a.partner)),
          nev: str(a, "name"),
          megjegyzes: typeof a.notes === "string" ? a.notes : undefined,
          websocket: typeof a.websocket === "boolean" ? a.websocket : undefined,
          sslKikenyszer: typeof a.force_ssl === "boolean" ? a.force_ssl : undefined,
        },
        c.szereplo,
      );
      if (!r.ok) throw new Error(r.message);
      return r;
    },
  },
  {
    name: "site_ssl_renew",
    description:
      "Renew the site's certificate now (or issue one if it has none / it no longer covers the hostnames).",
    params: { site: OLDAL },
    run: async (a, c) =>
      siker(
        await infraApi.sslMegujit(
          await infraApi.oldalAzonosit(kotelezo(a, "site")),
          c.szereplo,
        ),
      ),
  },
  {
    name: "site_delete",
    description:
      "Delete a site: removes the NPM proxy host (certificate is kept) and, with dns=true, the Cloudflare records. Needs confirm_host = the main hostname.",
    destructive: true,
    params: {
      site: OLDAL,
      confirm_host: {
        type: "string",
        description: "Type the main hostname to confirm.",
        required: true,
      },
      dns: { type: "boolean", description: "Also delete the DNS records." },
    },
    run: async (a, c) => {
      const id = await infraApi.oldalAzonosit(kotelezo(a, "site"));
      const o = await infraApi.getOldal(id);
      if (!o || o.hostnevek[0] !== kotelezo(a, "confirm_host").toLowerCase())
        throw new Error(
          "A megerősítésként megadott hostnév nem egyezik az oldal fő hostnevével.",
        );
      return siker(await infraApi.torolOldal(id, { dns: a.dns === true }, c.szereplo));
    },
  },
  {
    name: "template_list",
    description:
      "List the stack templates (reusable compose + default env for stack_create).",
    readOnly: true,
    params: {},
    run: async () => infraApi.listSablonok(),
  },
  {
    name: "template_get",
    description:
      "One stack template with its compose and default env (compose is masked unless reveal=true).",
    readOnly: true,
    params: {
      template: {
        type: "string",
        description: "Template id or name.",
        required: true,
        positional: true,
      },
      reveal: { type: "boolean", description: "Show secret-looking values unmasked." },
    },
    run: async (a) => {
      const t = await infraApi.getSablon(
        await infraApi.sablonAzonosit(kotelezo(a, "template")),
      );
      if (!t) throw new Error("A sablon nem található.");
      return a.reveal === true
        ? t
        : { ...t, compose: maszkolCompose(t.compose), env: maszkolEnv(t.env) };
    },
  },
  {
    name: "template_create",
    description: "Create a stack template from a compose file and optional default env.",
    params: {
      name: {
        type: "string",
        description: "Template name.",
        required: true,
        positional: true,
      },
      compose: { type: "string", description: "Compose YAML.", required: true },
      env: {
        type: "string[]",
        description: "Default env as NAME=value (not encrypted: keep real secrets out).",
      },
      type: {
        type: "string",
        description: "Default stack type.",
        enum: ["projekt", "szolgaltatas", "rendszer"],
      },
      description: { type: "string", description: "Short description." },
    },
    run: async (a, c) =>
      siker(
        await infraApi.ujSablon(
          {
            nev: kotelezo(a, "name"),
            compose: kotelezo(a, "compose"),
            env: envSorok(a),
            tipus: str(a, "type") as "projekt" | "szolgaltatas" | "rendszer" | undefined,
            leiras: str(a, "description"),
          },
          c.szereplo,
        ),
      ),
  },
  {
    name: "template_delete",
    description:
      "Delete a stack template (stacks created from it are unaffected). Needs confirm_name = the template name.",
    destructive: true,
    params: {
      template: {
        type: "string",
        description: "Template id or name.",
        required: true,
        positional: true,
      },
      confirm_name: {
        type: "string",
        description: "Type the template name to confirm.",
        required: true,
      },
    },
    run: async (a, c) => {
      const id = await infraApi.sablonAzonosit(kotelezo(a, "template"));
      const t = await infraApi.getSablon(id);
      if (!t || t.nev !== kotelezo(a, "confirm_name"))
        throw new Error("A megerősítésként megadott név nem egyezik a sablon nevével.");
      return siker(await infraApi.torolSablon(id, c.szereplo));
    },
  },
  {
    name: "web_list",
    description:
      "List tracked non-stack websites (WordPress, FTP web hosting). Filter by partner.",
    readOnly: true,
    params: {
      partner: {
        type: "string",
        description: "Only websites of this partner (id or name).",
      },
    },
    run: async (a) =>
      infraApi.listWebhelyek({
        partnerId: str(a, "partner")
          ? await partnerAzonosit(kotelezo(a, "partner"))
          : undefined,
      }),
  },
  {
    name: "web_get",
    description:
      "One tracked website with its stored logins (host, user, directory — never the password).",
    readOnly: true,
    params: WEB_PARAM,
    run: async (a) => {
      const w = await infraApi.getWebhely(
        await infraApi.webhelyAzonosit(kotelezo(a, "web")),
      );
      if (!w) throw new Error("A webhely nem található.");
      return w;
    },
  },
  {
    name: "web_create",
    description:
      "Track a WordPress / FTP-hosted website and optionally assign it to a partner.",
    params: {
      name: { type: "string", description: "Display name.", required: true },
      hosts: {
        type: "string[]",
        description: "Hostnames; the first is the main one.",
        required: true,
      },
      type: {
        type: "string",
        description: "Website type.",
        enum: ["wordpress", "ftp", "egyeb"],
      },
      partner: {
        type: "string",
        description: "Partner id or name (omit for an internal site).",
      },
      hosting: { type: "string", description: "Hosting provider / server." },
      expires: {
        type: "string",
        description: "Hosting/domain expiry date (YYYY-MM-DD).",
      },
      note: { type: "string", description: "Note." },
    },
    run: async (a, c) =>
      siker(
        await infraApi.ujWebhely(
          {
            nev: kotelezo(a, "name"),
            tipus: str(a, "type") as "wordpress" | "ftp" | "egyeb" | undefined,
            hostnevek: lista(a, "hosts") ?? [],
            partnerId: str(a, "partner")
              ? await partnerAzonosit(kotelezo(a, "partner"))
              : undefined,
            tarhely: str(a, "hosting"),
            lejarat: str(a, "expires"),
            megjegyzes: str(a, "note"),
          },
          c.szereplo,
        ),
      ),
  },
  {
    name: "web_set",
    description:
      'Change a tracked website: name, type, partner (partner="" makes it internal), hosting, expiry, note.',
    params: {
      web: WEB_PARAM.web,
      name: { type: "string", description: "New display name." },
      type: {
        type: "string",
        description: "Website type.",
        enum: ["wordpress", "ftp", "egyeb"],
      },
      partner: { type: "string", description: 'Partner id or name; "" clears it.' },
      hosting: { type: "string", description: "Hosting provider / server." },
      expires: { type: "string", description: "Expiry date (YYYY-MM-DD)." },
      note: { type: "string", description: "Note." },
    },
    run: async (a, c) => {
      const id = await infraApi.webhelyAzonosit(kotelezo(a, "web"));
      const w = await infraApi.getWebhely(id);
      if (!w) throw new Error("A webhely nem található.");
      const partner =
        a.partner === undefined
          ? w.partnerId
          : a.partner === ""
            ? undefined
            : await partnerAzonosit(String(a.partner));
      return siker(
        await infraApi.modositWebhely(
          id,
          {
            nev: str(a, "name") ?? w.nev,
            tipus: (str(a, "type") ?? w.tipus) as "wordpress" | "ftp" | "egyeb",
            hostnevek: w.hostnevek,
            partnerId: partner,
            tarhely: str(a, "hosting") ?? w.tarhely,
            lejarat: str(a, "expires") ?? w.lejarat?.slice(0, 10),
            megjegyzes: str(a, "note") ?? w.megjegyzes,
          },
          c.szereplo,
        ),
      );
    },
  },
  {
    name: "web_check",
    description:
      "Read-only probe of a tracked website: HTTPS status and whether it answers like WordPress.",
    params: WEB_PARAM,
    run: async (a, c) =>
      siker(
        await infraApi.ellenorizWebhely(
          await infraApi.webhelyAzonosit(kotelezo(a, "web")),
          c.szereplo,
        ),
      ),
  },
  {
    name: "web_delete",
    description:
      "Delete a tracked website and every login stored for it. Needs confirm_name = the website name.",
    destructive: true,
    params: {
      web: WEB_PARAM.web,
      confirm_name: {
        type: "string",
        description: "Type the website name to confirm.",
        required: true,
      },
    },
    run: async (a, c) => {
      const id = await infraApi.webhelyAzonosit(kotelezo(a, "web"));
      const w = await infraApi.getWebhely(id);
      if (!w || w.nev !== kotelezo(a, "confirm_name"))
        throw new Error("A megerősítésként megadott név nem egyezik a webhely nevével.");
      return siker(await infraApi.torolWebhely(id, c.szereplo));
    },
  },
  {
    name: "access_add",
    description:
      "Store a login (FTP/SFTP/FTPS, WordPress admin, panel…) for a tracked website. The password is encrypted at rest.",
    params: {
      web: WEB_PARAM.web,
      label: {
        type: "string",
        description: "Label, e.g. 'Production SFTP'.",
        required: true,
      },
      type: {
        type: "string",
        description: "Login type.",
        enum: ["ftp", "sftp", "ftps", "wordpress", "cpanel", "egyeb"],
      },
      host: { type: "string", description: "Host name.", required: true },
      port: { type: "number", description: "Port (default by type)." },
      user: { type: "string", description: "User name." },
      password: {
        type: "string",
        description: "Password (visible in shell history when passed on the CLI).",
      },
      dir: { type: "string", description: "Remote directory." },
      url: { type: "string", description: "URL, e.g. the WordPress admin." },
      note: { type: "string", description: "Note." },
    },
    run: async (a, c) =>
      siker(
        await infraApi.ujHozzaferes(
          await infraApi.webhelyAzonosit(kotelezo(a, "web")),
          {
            tipus: str(a, "type") as "ftp" | undefined,
            cimke: kotelezo(a, "label"),
            host: kotelezo(a, "host"),
            port: szam(a, "port"),
            felhasznalo: str(a, "user"),
            jelszo: str(a, "password"),
            konyvtar: str(a, "dir"),
            url: str(a, "url"),
            megjegyzes: str(a, "note"),
          },
          c.szereplo,
        ),
      ),
  },
  {
    name: "access_password",
    description:
      "Return the stored password of a login. Audited (actor + time, never the value). Refuses unless reveal=true.",
    params: {
      web: WEB_PARAM.web,
      label: { type: "string", description: "Label of the login.", required: true },
      reveal: { type: "boolean", description: "Must be true to return the password." },
    },
    run: async (a, c) => {
      if (a.reveal !== true)
        throw new Error(
          "A jelszó csak reveal=true mellett adható ki (a megtekintés naplózódik).",
        );
      const w = await infraApi.getWebhely(
        await infraApi.webhelyAzonosit(kotelezo(a, "web")),
      );
      const h = w?.hozzaferesek.find(
        (x) => x.cimke.toLowerCase() === kotelezo(a, "label").toLowerCase(),
      );
      if (!h) throw new Error("Nincs ilyen címkéjű hozzáférés ennél a webhelynél.");
      const r = await infraApi.hozzaferesJelszo(h.id, c.szereplo);
      if (!r.ok) throw new Error(r.message);
      return { label: h.cimke, host: h.host, user: h.felhasznalo, password: r.jelszo };
    },
  },
  {
    name: "access_delete",
    description:
      "Delete one stored login of a website. Needs confirm_label = the login's label.",
    destructive: true,
    params: {
      web: WEB_PARAM.web,
      label: { type: "string", description: "Label of the login.", required: true },
      confirm_label: {
        type: "string",
        description: "Type the label to confirm.",
        required: true,
      },
    },
    run: async (a, c) => {
      const w = await infraApi.getWebhely(
        await infraApi.webhelyAzonosit(kotelezo(a, "web")),
      );
      const h = w?.hozzaferesek.find(
        (x) => x.cimke.toLowerCase() === kotelezo(a, "label").toLowerCase(),
      );
      if (!h) throw new Error("Nincs ilyen címkéjű hozzáférés ennél a webhelynél.");
      if (h.cimke !== kotelezo(a, "confirm_label"))
        throw new Error("A megerősítésként megadott címke nem egyezik.");
      return siker(await infraApi.torolHozzaferes(h.id, c.szereplo));
    },
  },
  {
    name: "events",
    description:
      "Audit log of infra operations (who did what, ok/failed). Never contains secrets.",
    readOnly: true,
    params: {
      stack: { type: "string", description: "Only events of this stack." },
      site: { type: "string", description: "Only events of this site." },
      limit: { type: "number", description: "Max rows (default 30)." },
    },
    run: async (a) =>
      infraApi.listEsemenyek({
        ...(str(a, "stack")
          ? {
              celTipus: "stack" as const,
              celId: await infraApi.stackAzonosit(kotelezo(a, "stack")),
            }
          : str(a, "site")
            ? {
                celTipus: "oldal" as const,
                celId: await infraApi.oldalAzonosit(kotelezo(a, "site")),
              }
            : {}),
        limit: szam(a, "limit") ?? 30,
      }),
  },
  {
    name: "integration_list",
    description:
      "Provider connections (Cloudflare, NPM, Portainer) with their last health check. Credentials are never shown.",
    readOnly: true,
    params: {},
    run: () => infraApi.listIntegraciok(),
  },
  {
    name: "integration_test",
    description: "Probe a provider connection now and store the result.",
    params: {
      integration: {
        type: "string",
        description: "Connection id (see integration_list).",
        required: true,
        positional: true,
      },
    },
    run: async (a) => siker(await infraApi.tesztIntegracio(kotelezo(a, "integration"))),
  },
];

export function toolKeres(nev: string): Tool | undefined {
  return TOOLS.find((t) => t.name === nev);
}

/** JSON Schema of a tool's parameters (used by the MCP `tools/list`). */
export function jsonSchema(t: Tool): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const [k, p] of Object.entries(t.params)) {
    properties[k] =
      p.type === "string[]"
        ? { type: "array", items: { type: "string" }, description: p.description }
        : {
            type: p.type,
            description: p.description,
            ...(p.enum ? { enum: p.enum } : {}),
          };
  }
  return {
    type: "object",
    properties,
    required: Object.entries(t.params)
      .filter(([, p]) => p.required)
      .map(([k]) => k),
    additionalProperties: false,
  };
}

/** Validates and coerces raw args against the declared params (CLI strings, MCP JSON). */
export function argumentumok(t: Tool, nyers: Args): Args {
  const ki: Args = {};
  for (const [k, v] of Object.entries(nyers)) {
    const p = t.params[k];
    if (!p)
      throw new Error(
        `Ismeretlen paraméter: ${k} (a(z) ${t.name} ezeket várja: ${Object.keys(t.params).join(", ") || "—"}).`,
      );
    if (p.type === "number") ki[k] = Number(v);
    else if (p.type === "boolean") ki[k] = v === true || v === "true" || v === "1";
    else if (p.type === "string[]")
      ki[k] = Array.isArray(v)
        ? v.map(String)
        : String(v)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    else ki[k] = String(v);
    if (p.enum && p.type === "string" && !p.enum.includes(ki[k] as string))
      throw new Error(`A(z) ${k} értéke ${p.enum.join(" | ")} lehet.`);
  }
  for (const [k, p] of Object.entries(t.params)) {
    if (p.required && (ki[k] === undefined || ki[k] === ""))
      throw new Error(`Hiányzó paraméter: ${k}`);
  }
  return ki;
}

export async function futtat(nev: string, nyers: Args, ctx: ToolCtx): Promise<unknown> {
  const t = toolKeres(nev);
  if (!t) throw new Error(`Ismeretlen eszköz: ${nev}`);
  return t.run(argumentumok(t, nyers), ctx);
}
