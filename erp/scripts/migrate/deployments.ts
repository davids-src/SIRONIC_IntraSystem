/**
 * Legacy `Deployment` / `DeploymentEvent` / `DeploymentPackage` / `DeploymentPayment` /
 * `DomainHostingRecord` / `IntegrationConnection` / `StackTemplate` / `PartnerDeploymentAccess`
 * -> `@erp/deployments` mapping (skeleton).
 *
 * Pure functions only: no DB connection, no env access, no decryption. The caller (a future
 * runner) loads legacy documents from a read-only export, filters ONE tenant, and passes the
 * id maps in. Re-runs are idempotent through these natural keys:
 *
 *   deployments_telepitesek   key: azonosito   (domain is also unique)
 *   deployments_csomagok      key: kod
 *   deployments_integraciok   key: (szolgaltato, cimke)
 *   deployments_fizetesek     key: (telepitesId, idoszakKezdet)
 *   deployments_sablonok      key: nev
 *
 * Decisions encoded here:
 *  - `tenantId` is dropped (single tenant); legacy `_id`s are never reused as new ids.
 *  - Credentials stay ciphertext. The legacy `encrypted_credentials` uses the same AES-256-GCM
 *    envelope and the same SECRETS_ENCRYPTION_KEY, so it is carried over verbatim.
 *  - A stored legacy `overdue` payment becomes `esedekes`: overdue is computed lazily now.
 *  - DomainHostingRecord is absorbed into `Telepites.lejaratok` (D12): attached to the
 *    deployment of the same partner when exactly one exists, otherwise emitted as a
 *    registry-only deployment (`forras: "nyilvantartas"`) so no record is lost.
 *  - Dropped on purpose: `provision_token_encrypted`, `admin_sync`, `oidc_client_id`
 *    (portal/OIDC provisioning is outside this slice).
 */

type Datumszeru = Date | string | null | undefined;

const datum = (d: Datumszeru): Date | undefined => {
  if (d === null || d === undefined || d === "") return undefined;
  const v = d instanceof Date ? d : new Date(d);
  return Number.isNaN(v.getTime()) ? undefined : v;
};
const szoveg = (s: string | null | undefined): string | undefined => {
  const v = s?.trim();
  return v ? v : undefined;
};
const szam = (n: number | null | undefined): number | undefined =>
  typeof n === "number" ? n : undefined;

export type IdMap = ReadonlyMap<string, string>;

// ---------------------------------------------------------------- enum maps

const LEPES_KULCS: Record<string, string> = {
  cloudflare_zone: "cloudflare_zona",
  ns_delegation: "ns_delegalas",
  dns_records: "dns_rekordok",
  ssl_certificate: "ssl_tanusitvany",
  proxy_host: "proxy_host",
  image_build: "image_epites",
  stack_create: "stack_letrehozas",
  stack_deploy: "stack_inditas",
};

const LEPES_ALLAPOT: Record<string, string> = {
  pending: "fuggo",
  running: "fut",
  done: "kesz",
  failed: "hibas",
  skipped: "kihagyva",
  adopted: "adoptalva",
  manual_required: "kezi",
};

const TELEPITES_ALLAPOT: Record<string, string> = {
  draft: "piszkozat",
  provisioning: "kiepites",
  live: "elo",
  degraded: "serult",
  suspended: "felfuggesztve",
  archived: "archivalt",
};

const CIKLUS: Record<string, string> = {
  monthly: "havi",
  quarterly: "negyedeves",
  yearly: "eves",
};

const FIZETES_ALLAPOT: Record<string, string> = {
  due: "esedekes",
  overdue: "esedekes",
  paid: "fizetve",
  waived: "elengedve",
  cancelled: "torolve",
};

const ESEMENY_TIPUS: Record<string, string> = {
  step_plan: "lepes_terv",
  step_execute_start: "lepes_inditas",
  step_execute_ok: "lepes_ok",
  step_execute_fail: "lepes_hiba",
  step_adopt: "lepes_adopt",
  step_skip: "lepes_kihagy",
  step_verify: "lepes_ellenorzes",
  redeploy: "ujratelepites",
  billing: "szamlazas",
  import: "import",
  admin_sync: "megjegyzes",
  note: "megjegyzes",
};

const SZEREPLO_TIPUS: Record<string, string> = {
  crm_user: "munkatars",
  portal_user: "portal",
  system: "rendszer",
  webhook: "webhook",
};

const HOZZAFERES_SZINT: Record<string, string> = { view: "megtekint", manage: "kezel" };

// ---------------------------------------------------------------- legacy shapes

export type LegacyStep = {
  key: string;
  status: string;
  external_id?: string | null;
  message?: string | null;
  last_error?: string | null;
  started_at?: Datumszeru;
  finished_at?: Datumszeru;
  meta?: Record<string, unknown> | null;
};

export type LegacyDeployment = {
  _id: string;
  contact_id?: string | null;
  deployment_number: string;
  name: string;
  domain: string;
  www_redirect?: boolean;
  status: string;
  notes?: string | null;
  dns?: { record_type?: string; name?: string; target?: string | null; proxied?: boolean };
  proxy?: {
    forward_host?: string | null;
    forward_port?: number | null;
    forward_scheme?: string;
    websocket_support?: boolean;
  };
  image?: {
    repository?: string | null;
    tag?: string | null;
    workflow_id?: string | null;
    workflow_ref?: string | null;
  };
  stack?: {
    stack_name?: string | null;
    template_id?: string | null;
    compose_yaml?: string | null;
    env?: Array<{ name: string; value: string }>;
  };
  group_id?: string | null;
  package_id?: string | null;
  billing_cycle?: string | null;
  price_override_huf?: number | null;
  next_billing_at?: Datumszeru;
  last_paid_at?: Datumszeru;
  billing_notes?: string | null;
  steps?: LegacyStep[];
  external_ids?: {
    cloudflare_zone_id?: string | null;
    cloudflare_dns_record_ids?: string[];
    npm_certificate_id?: number | null;
    npm_proxy_host_id?: number | null;
    portainer_stack_id?: number | null;
    portainer_endpoint_id?: number | null;
    portainer_webhook_id?: string | null;
    github_last_run_id?: number | null;
    image_digest?: string | null;
  };
  source?: "created" | "imported";
  migrated_from_domain_hosting_id?: string | null;
  created_by: string;
  archived_at?: Datumszeru;
  archive_reason?: string | null;
  created_at?: Datumszeru;
  updated_at?: Datumszeru;
};

export type LegacyDeploymentEvent = {
  deployment_id: string;
  step_key?: string | null;
  kind: string;
  actor_id?: string | null;
  actor_type: string;
  message: string;
  detail?: unknown;
  duration_ms?: number | null;
  created_at?: Datumszeru;
};

export type LegacyDeploymentPackage = {
  code: string;
  name: string;
  description?: string | null;
  price_huf: number;
  default_cycle: string;
  resources?: {
    vcpu?: number | null;
    ram_mb?: number | null;
    disk_gb?: number | null;
    bandwidth_gb?: number | null;
    custom?: Record<string, unknown> | null;
  };
  is_active?: boolean;
  sort_order?: number;
};

export type LegacyDeploymentPayment = {
  deployment_id: string;
  contact_id?: string | null;
  package_id?: string | null;
  period_start: Datumszeru;
  period_end: Datumszeru;
  amount_huf: number;
  currency?: string;
  cycle: string;
  status: string;
  paid_at?: Datumszeru;
  invoice_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
};

export type LegacyDomainHostingRecord = {
  _id: string;
  contact_id: string;
  record_type: string;
  label: string;
  provider?: string | null;
  expiry_date?: Datumszeru;
  auto_renew?: boolean | null;
  details?: string | null;
};

export type LegacyIntegrationConnection = {
  provider: string;
  label: string;
  base_url: string;
  encrypted_credentials: string;
  meta?: Record<string, unknown>;
  is_active?: boolean;
  last_healthcheck_at?: Datumszeru;
  last_healthcheck_ok?: boolean | null;
  last_healthcheck_message?: string | null;
  created_by: string;
};

export type LegacyStackTemplate = {
  _id: string;
  name: string;
  description?: string | null;
  is_default?: boolean;
  compose_yaml: string;
  placeholders?: Array<{
    key: string;
    label: string;
    required?: boolean;
    default_value?: string | null;
    secret?: boolean;
  }>;
  required_networks?: string[];
  created_by: string;
};

export type LegacyPartnerDeploymentAccess = {
  contact_id: string;
  portal_user_id: string;
  deployment_id: string;
  access_level: string;
  created_by?: string | null;
};

// ---------------------------------------------------------------- context

export type MigraltKontextus = {
  /** legacy contact id -> new Partner id */
  partnerIds: IdMap;
  /** legacy user id -> new User id */
  userIds: IdMap;
  /** legacy group id -> new csoport id */
  csoportIds?: IdMap;
  /** legacy deployment _id -> new Telepites id (needed by events, payments, access) */
  telepitesIds?: IdMap;
  /** legacy package _id -> new Csomag id */
  csomagIds?: IdMap;
  /** legacy stack template _id -> new StackSablon id */
  sablonIds?: IdMap;
  /** legacy portal user id -> new portal user id */
  portalUserIds?: IdMap;
};

export type MigracioFigyelmeztetes = { forras: string; uzenet: string };

const feloldas = (m: IdMap | undefined, id: string | null | undefined) =>
  id ? (m?.get(id) ?? undefined) : undefined;

// ---------------------------------------------------------------- mappers

export function mapCsomag(l: LegacyDeploymentPackage) {
  const e = l.resources ?? {};
  return {
    kod: l.code.trim(),
    nev: l.name.trim(),
    leiras: szoveg(l.description),
    arHuf: l.price_huf,
    alapCiklus: CIKLUS[l.default_cycle] ?? "havi",
    eroforrasok: {
      vcpu: szam(e.vcpu),
      ramMb: szam(e.ram_mb),
      diskGb: szam(e.disk_gb),
      savszelessegGb: szam(e.bandwidth_gb),
      egyeb: e.custom ?? undefined,
    },
    aktiv: l.is_active ?? true,
    sorrend: l.sort_order ?? 0,
  };
}

export function mapIntegracio(l: LegacyIntegrationConnection, ctx: Pick<MigraltKontextus, "userIds">) {
  return {
    szolgaltato: l.provider,
    cimke: l.label.trim(),
    alapUrl: l.base_url.trim(),
    // Ciphertext, same envelope and key: never decrypted or re-encrypted here.
    hitelesitoTitkositott: l.encrypted_credentials,
    meta: l.meta ?? {},
    aktiv: l.is_active ?? true,
    utolsoEllenorzes: datum(l.last_healthcheck_at),
    utolsoEllenorzesOk: l.last_healthcheck_ok ?? undefined,
    utolsoEllenorzesUzenet: szoveg(l.last_healthcheck_message),
    letrehozoId: feloldas(ctx.userIds, l.created_by) ?? l.created_by,
  };
}

export function mapSablon(l: LegacyStackTemplate, ctx: Pick<MigraltKontextus, "userIds">) {
  return {
    nev: l.name.trim(),
    leiras: szoveg(l.description),
    alapertelmezett: l.is_default ?? false,
    composeYaml: l.compose_yaml,
    helyorzok: (l.placeholders ?? []).map((p) => ({
      kulcs: p.key,
      cimke: p.label,
      kotelezo: p.required ?? false,
      alapertek: szoveg(p.default_value),
      titkos: p.secret ?? false,
    })),
    szuksegesHalozatok: l.required_networks?.length ? l.required_networks : ["nginxproxy_default"],
    letrehozoId: feloldas(ctx.userIds, l.created_by) ?? l.created_by,
  };
}

export function mapLepes(l: LegacyStep) {
  return {
    kulcs: LEPES_KULCS[l.key] ?? l.key,
    allapot: LEPES_ALLAPOT[l.status] ?? "fuggo",
    kulsoId: szoveg(l.external_id),
    uzenet: szoveg(l.message),
    utolsoHiba: szoveg(l.last_error),
    inditva: datum(l.started_at),
    befejezve: datum(l.finished_at),
    meta: l.meta ?? undefined,
  };
}

export function mapLejarat(l: LegacyDomainHostingRecord) {
  return {
    tipus: l.record_type,
    cimke: l.label.trim(),
    szolgaltato: szoveg(l.provider),
    lejarat: datum(l.expiry_date),
    autoMegujitas: l.auto_renew ?? undefined,
    reszletek: szoveg(l.details),
  };
}

export function mapTelepites(l: LegacyDeployment, ctx: MigraltKontextus) {
  const k = l.external_ids ?? {};
  return {
    azonosito: l.deployment_number,
    nev: l.name.trim(),
    domain: l.domain.trim().toLowerCase(),
    wwwAtiranyitas: l.www_redirect ?? true,
    allapot: TELEPITES_ALLAPOT[l.status] ?? "piszkozat",
    forras: l.source === "imported" ? "importalt" : "letrehozott",
    megjegyzes: szoveg(l.notes),
    partnerId: feloldas(ctx.partnerIds, l.contact_id),
    csoportId: feloldas(ctx.csoportIds, l.group_id),
    dns: {
      rekordTipus: l.dns?.record_type ?? "A",
      nev: l.dns?.name ?? "@",
      cel: szoveg(l.dns?.target),
      proxied: l.dns?.proxied ?? false,
    },
    proxy: {
      celHost: szoveg(l.proxy?.forward_host),
      celPort: szam(l.proxy?.forward_port),
      celSema: l.proxy?.forward_scheme ?? "http",
      websocket: l.proxy?.websocket_support ?? true,
    },
    image: {
      repo: szoveg(l.image?.repository),
      tag: szoveg(l.image?.tag),
      workflowId: szoveg(l.image?.workflow_id),
      workflowRef: szoveg(l.image?.workflow_ref) ?? "main",
    },
    stack: {
      nev: szoveg(l.stack?.stack_name),
      sablonId: feloldas(ctx.sablonIds, l.stack?.template_id),
      composeYaml: szoveg(l.stack?.compose_yaml),
      // Legacy env had no secret flag and stored plain values: kept as non-secret entries.
      env: (l.stack?.env ?? []).map((e) => ({ nev: e.name, ertek: e.value, titkos: false })),
    },
    csomagId: feloldas(ctx.csomagIds, l.package_id),
    szamlazasiCiklus: l.billing_cycle ? CIKLUS[l.billing_cycle] : undefined,
    arFelulirasHuf: szam(l.price_override_huf),
    kovetkezoSzamlazas: datum(l.next_billing_at),
    utolsoFizetes: datum(l.last_paid_at),
    szamlazasiMegjegyzes: szoveg(l.billing_notes),
    lepesek: (l.steps ?? []).map(mapLepes),
    kulsoIdk: {
      cloudflareZonaId: szoveg(k.cloudflare_zone_id),
      cloudflareDnsRekordIdk: k.cloudflare_dns_record_ids ?? [],
      npmTanusitvanyId: szam(k.npm_certificate_id),
      npmProxyHostId: szam(k.npm_proxy_host_id),
      portainerStackId: szam(k.portainer_stack_id),
      portainerEndpointId: szam(k.portainer_endpoint_id),
      portainerWebhookId: szoveg(k.portainer_webhook_id),
      githubUtolsoFutasId: szam(k.github_last_run_id),
      imageDigest: szoveg(k.image_digest),
    },
    lejaratok: [] as Array<ReturnType<typeof mapLejarat>>,
    letrehozoId: feloldas(ctx.userIds, l.created_by) ?? l.created_by,
    archivalasOka: szoveg(l.archive_reason),
    archivalasIdopont: datum(l.archived_at),
    migraltDomainHostingId: szoveg(l.migrated_from_domain_hosting_id),
    createdAt: datum(l.created_at),
    updatedAt: datum(l.updated_at),
    // Resolve-by-key hint for the runner (not a model field).
    _legacyId: l._id,
  };
}

/** Event of a deployment already inserted. Returns null when the deployment id is unknown. */
export function mapEsemeny(l: LegacyDeploymentEvent, ctx: MigraltKontextus) {
  const telepitesId = feloldas(ctx.telepitesIds, l.deployment_id);
  if (!telepitesId) return null;
  return {
    telepitesId,
    lepesKulcs: l.step_key ? (LEPES_KULCS[l.step_key] ?? null) : null,
    tipus: ESEMENY_TIPUS[l.kind] ?? "megjegyzes",
    szereploId: feloldas(ctx.userIds, l.actor_id) ?? feloldas(ctx.portalUserIds, l.actor_id),
    szereploTipus: SZEREPLO_TIPUS[l.actor_type] ?? "rendszer",
    uzenet: l.message,
    reszlet: l.detail ?? undefined,
    idotartamMs: szam(l.duration_ms),
    createdAt: datum(l.created_at),
  };
}

export function mapFizetes(l: LegacyDeploymentPayment, ctx: MigraltKontextus) {
  const telepitesId = feloldas(ctx.telepitesIds, l.deployment_id);
  const idoszakKezdet = datum(l.period_start);
  const idoszakVeg = datum(l.period_end);
  if (!telepitesId || !idoszakKezdet || !idoszakVeg) return null;
  return {
    telepitesId,
    partnerId: feloldas(ctx.partnerIds, l.contact_id),
    csomagId: feloldas(ctx.csomagIds, l.package_id),
    idoszakKezdet,
    idoszakVeg,
    osszegHuf: l.amount_huf,
    penznem: l.currency ?? "HUF",
    ciklus: CIKLUS[l.cycle] ?? "havi",
    allapot: FIZETES_ALLAPOT[l.status] ?? "esedekes",
    fizetve: datum(l.paid_at),
    szamlaId: szoveg(l.invoice_id),
    megjegyzes: szoveg(l.notes),
    letrehozoId: feloldas(ctx.userIds, l.created_by),
  };
}

export function mapHozzaferes(l: LegacyPartnerDeploymentAccess, ctx: MigraltKontextus) {
  const telepitesId = feloldas(ctx.telepitesIds, l.deployment_id);
  const partnerId = feloldas(ctx.partnerIds, l.contact_id);
  const portalFelhasznaloId = feloldas(ctx.portalUserIds, l.portal_user_id);
  if (!telepitesId || !partnerId || !portalFelhasznaloId) return null;
  return {
    partnerId,
    portalFelhasznaloId,
    telepitesId,
    szint: HOZZAFERES_SZINT[l.access_level] ?? "megtekint",
    letrehozoId: feloldas(ctx.userIds, l.created_by),
  };
}

// ---------------------------------------------------------------- orchestration

export type DeploymentsMigracioBemenet = {
  telepitesek: LegacyDeployment[];
  csomagok?: LegacyDeploymentPackage[];
  integraciok?: LegacyIntegrationConnection[];
  sablonok?: LegacyStackTemplate[];
  domainHostingok?: LegacyDomainHostingRecord[];
};

/**
 * Plans the id-independent part of the migration (documents that do not reference new ids of
 * other migrated documents beyond the partner / user / template / package maps in `ctx`).
 * Events, payments and access rows are mapped afterwards with `mapEsemeny` / `mapFizetes` /
 * `mapHozzaferes`, once the runner has filled `ctx.telepitesIds`.
 */
export function migraljDeployments(bemenet: DeploymentsMigracioBemenet, ctx: MigraltKontextus) {
  const figyelmeztetesek: MigracioFigyelmeztetes[] = [];
  const telepitesek = bemenet.telepitesek.map((t) => mapTelepites(t, ctx));

  // D12: DomainHostingRecord -> lejaratok of the partner's deployment.
  const partnerTelepitesek = new Map<string, typeof telepitesek>();
  for (const t of telepitesek) {
    if (!t.partnerId) continue;
    const lista = partnerTelepitesek.get(t.partnerId) ?? [];
    lista.push(t);
    partnerTelepitesek.set(t.partnerId, lista);
  }
  const nyilvantartasok: Array<{
    azonosito?: string;
    nev: string;
    partnerId: string;
    forras: "nyilvantartas";
    allapot: "elo";
    lejaratok: Array<ReturnType<typeof mapLejarat>>;
    migraltDomainHostingId: string;
  }> = [];

  for (const r of bemenet.domainHostingok ?? []) {
    const partnerId = feloldas(ctx.partnerIds, r.contact_id);
    if (!partnerId) {
      figyelmeztetesek.push({
        forras: `DomainHostingRecord ${r._id}`,
        uzenet: `ismeretlen partner (${r.contact_id}), kihagyva`,
      });
      continue;
    }
    const cel = partnerTelepitesek.get(partnerId);
    if (cel?.length === 1) {
      cel[0]!.lejaratok.push(mapLejarat(r));
    } else {
      nyilvantartasok.push({
        nev: r.label.trim(),
        partnerId,
        forras: "nyilvantartas",
        allapot: "elo",
        lejaratok: [mapLejarat(r)],
        migraltDomainHostingId: r._id,
      });
    }
  }

  return {
    telepitesek,
    nyilvantartasok,
    csomagok: (bemenet.csomagok ?? []).map(mapCsomag),
    integraciok: (bemenet.integraciok ?? []).map((i) => mapIntegracio(i, ctx)),
    sablonok: (bemenet.sablonok ?? []).map((s) => mapSablon(s, ctx)),
    figyelmeztetesek,
  };
}
