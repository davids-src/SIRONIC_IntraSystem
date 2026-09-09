"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CheckboxField,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
} from "@crm/ui";
import type { Column } from "@crm/ui";
import type { IntegrationConnection, IntegrationProvider } from "@crm/types";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

type ConnectionRow = Omit<IntegrationConnection, "encrypted_credentials"> & {
  has_credentials: true;
};

const PROVIDER_LABEL: Record<IntegrationProvider, string> = {
  cloudflare: "Cloudflare",
  npm: "Nginx Proxy Manager",
  portainer: "Portainer",
  github: "GitHub",
};

const CREDENTIAL_FIELDS: Record<IntegrationProvider, string[]> = {
  cloudflare: ["api_token"],
  npm: ["email", "password"],
  portainer: ["api_key"],
  github: ["token"],
};

const DEFAULT_BASE_URL: Partial<Record<IntegrationProvider, string>> = {
  cloudflare: "https://api.cloudflare.com/client/v4",
};

const SELF_HOSTED_PROVIDERS: IntegrationProvider[] = ["npm", "portainer"];

const PROVIDER_SETUP_NOTES: Record<IntegrationProvider, string[]> = {
  cloudflare: [
    "Nem önhosztolt — a Cloudflare fiókodban hozd létre: My Profile → API Tokens → Create Token → Custom token.",
    "Jogosultságok: Account → Zone → Edit (zóna LÉTREHOZÁSHOZ kell, ez account-szintű), Zone → DNS → Edit, Zone → Zone Settings → Read.",
    "Zone Resources: Include → All zones from account (különben új zónát nem tud létrehozni).",
    "Base URL mindig: https://api.cloudflare.com/client/v4",
  ],
  npm: [
    "Önhosztolt — csak akkor érhető el, ha a CRM konténer ugyanazon a docker hálózaton van (pl. nginxproxy_default), vagy a szerver LAN IP-jén publikált porton (:81).",
    "Hitelesítés: ugyanaz az email+jelszó, amivel az NPM admin felületére (:81) belépsz — érdemes külön felhasználót létrehozni csak erre.",
    "A CRM 2.11.3-nál régebbi NPM verziónál elutasítja a cert/proxy műveleteket (CVE-2024-39935 védelem).",
  ],
  portainer: [
    "Önhosztolt — ugyanaz a hálózati szabály, mint az NPM-nél: közös docker hálózat vagy a szerver LAN IP-je + publikált port (gyakran :9443 HTTPS vagy :9000 HTTP).",
    "API kulcs: Portainer → felhasználói menü → My account → Access tokens → Add access token (csak egyszer látod, másold ki azonnal).",
    "Endpoint ID: Environments lista → a Docker környezet száma (általában 1).",
    "Ha önaláírt TLS tanúsítványt használ (pl. https://IP:9443), pipáld be lent az önaláírt tanúsítvány engedélyezését — enélkül a kapcsolat sikertelen lesz.",
  ],
  github: [
    "Nem önhosztolt — Settings → Developer settings → Personal access tokens → Fine-grained token.",
    "Jogosultságok: Actions (Read and write), Contents (Read-only), Packages (Read-only) a repóhoz, ahol a GHCR image épül.",
  ],
};

async function fetchConnections(): Promise<ConnectionRow[]> {
  return apiJson<ConnectionRow[]>("/api/integrations");
}

export default function IntegrationsSettingsPage() {
  const queryClient = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["integrations"],
    queryFn: fetchConnections,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ConnectionRow | null>(null);
  const [provider, setProvider] = useState<IntegrationProvider>("cloudflare");
  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [endpointId, setEndpointId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [allowInsecureTls, setAllowInsecureTls] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["integrations"] });

  const resetForm = () => {
    setProvider("cloudflare");
    setLabel("");
    setBaseUrl("");
    setCredentials({});
    setEndpointId("");
    setIsActive(true);
    setAllowInsecureTls(false);
  };

  const openCreateModal = () => {
    resetForm();
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEditModal = (row: ConnectionRow) => {
    setProvider(row.provider);
    setLabel(row.label);
    setBaseUrl(row.base_url);
    setCredentials({});
    setEndpointId(row.meta?.endpoint_id != null ? String(row.meta.endpoint_id) : "");
    setIsActive(row.is_active);
    setAllowInsecureTls(row.meta?.allow_insecure_tls === true);
    setEditTarget(row);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const buildMeta = (): Record<string, unknown> | undefined => {
    const meta: Record<string, unknown> = {};
    if (provider === "portainer" && endpointId) meta.endpoint_id = Number(endpointId);
    if (SELF_HOSTED_PROVIDERS.includes(provider))
      meta.allow_insecure_tls = allowInsecureTls;
    return Object.keys(meta).length > 0 ? meta : undefined;
  };

  const createMutation = useMutation({
    mutationFn: () =>
      apiJsonBody("/api/integrations", "POST", {
        provider,
        label,
        base_url: baseUrl,
        credentials,
        meta: buildMeta(),
      }),
    onSuccess: () => {
      toast.success("Integráció létrehozva.");
      closeModal();
      resetForm();
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Létrehozás sikertelen."),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editTarget) return Promise.reject(new Error("Nincs kiválasztott integráció."));
      const anyCredentialFilled = Object.values(credentials).some(
        (v) => v.trim().length > 0,
      );
      return apiJsonBody(`/api/integrations/${editTarget._id}`, "PATCH", {
        label,
        base_url: baseUrl,
        is_active: isActive,
        meta: buildMeta(),
        ...(anyCredentialFilled ? { credentials } : {}),
      });
    },
    onSuccess: () => {
      toast.success("Integráció frissítve.");
      closeModal();
      resetForm();
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Frissítés sikertelen."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiJsonBody(`/api/integrations/${id}`, "DELETE"),
    onSuccess: () => {
      toast.success("Integráció törölve.");
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Törlés sikertelen."),
  });

  const healthcheckMutation = useMutation({
    mutationFn: (id: string) =>
      apiJsonBody<{ ok: boolean; message: string }>(
        `/api/integrations/${id}/healthcheck`,
        "POST",
      ),
    onSuccess: (res) => {
      if (res.ok) toast.success(res.message);
      else toast.error(res.message, { duration: 10000 });
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : "Healthcheck sikertelen.", {
        duration: 10000,
      }),
  });

  const columns: Column<ConnectionRow>[] = [
    { key: "provider", header: "Provider", render: (r) => PROVIDER_LABEL[r.provider] },
    { key: "label", header: "Címke" },
    {
      key: "base_url",
      header: "Base URL",
      render: (r) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{r.base_url}</span>
      ),
    },
    {
      key: "is_active",
      header: "Állapot",
      width: "90px",
      render: (r) =>
        r.is_active ? (
          <Badge variant="success">Aktív</Badge>
        ) : (
          <Badge variant="default">Inaktív</Badge>
        ),
    },
    {
      key: "last_healthcheck_ok",
      header: "Healthcheck",
      render: (r) => {
        const badge =
          r.last_healthcheck_ok == null ? (
            <Badge variant="default">Nincs teszt</Badge>
          ) : r.last_healthcheck_ok ? (
            <Badge variant="success">OK</Badge>
          ) : (
            <Badge variant="error">Hiba</Badge>
          );
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {badge}
            {r.last_healthcheck_message ? (
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--color-text-muted, #555)",
                  maxWidth: "260px",
                  whiteSpace: "normal",
                }}
              >
                {r.last_healthcheck_message}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      width: "110px",
      render: (r) => (
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => healthcheckMutation.mutate(r._id)}
            title="Healthcheck"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => openEditModal(r)}
            title="Szerkesztés"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => confirm("Biztosan törlöd?") && deleteMutation.mutate(r._id)}
            title="Törlés"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-status-error, #f87171)",
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Integrációk"
        subtitle="Cloudflare, Nginx Proxy Manager, Portainer és GitHub kapcsolatok"
        actions={
          <Button variant="primary" onClick={openCreateModal}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új kapcsolat
          </Button>
        }
      />
      <Card className="p-0 overflow-hidden">
        <Table<ConnectionRow>
          data={rows}
          columns={columns}
          keyField="_id"
          emptyMessage="Nincs beállított integráció"
        />
      </Card>

      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            className="rounded-xl border p-6"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              width: "100%",
              maxWidth: "480px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 16px 0" }}>
              {editTarget
                ? `Integráció szerkesztése — ${editTarget.label}`
                : "Új integráció"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="flex flex-col gap-1.5">
                <Label>Provider</Label>
                {editTarget ? (
                  <Input value={PROVIDER_LABEL[provider]} readOnly disabled />
                ) : (
                  <Select
                    value={provider}
                    onValueChange={(v) => {
                      const next = v as IntegrationProvider;
                      setProvider(next);
                      setCredentials({});
                      if (!baseUrl && DEFAULT_BASE_URL[next]) {
                        setBaseUrl(DEFAULT_BASE_URL[next] as string);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[1100]">
                      {(Object.keys(PROVIDER_LABEL) as IntegrationProvider[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {PROVIDER_LABEL[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Input
                label="Címke"
                placeholder="pl. Production Cloudflare"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <Input
                label="Base URL"
                placeholder="https://api.cloudflare.com/client/v4"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              {provider === "portainer" && (
                <Input
                  label="Endpoint ID"
                  placeholder="1"
                  value={endpointId}
                  onChange={(e) => setEndpointId(e.target.value)}
                />
              )}
              {SELF_HOSTED_PROVIDERS.includes(provider) && (
                <CheckboxField
                  label="Önaláírt tanúsítvány engedélyezése (csak belső hálózaton!)"
                  checked={allowInsecureTls}
                  onCheckedChange={(checked) => setAllowInsecureTls(checked === true)}
                />
              )}
              <div
                className="rounded-lg border p-3"
                style={{
                  borderColor: "var(--color-border-subtle)",
                  background: "var(--color-bg-secondary)",
                }}
              >
                <p style={{ fontSize: "0.75rem", fontWeight: 700, margin: "0 0 6px 0" }}>
                  Beállítási útmutató — {PROVIDER_LABEL[provider]}
                </p>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "16px",
                    fontSize: "0.75rem",
                    color: "var(--color-text-muted, #555)",
                  }}
                >
                  {PROVIDER_SETUP_NOTES[provider].map((note) => (
                    <li key={note} style={{ marginBottom: "4px" }}>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
              {editTarget ? (
                <>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-text-muted, #555)",
                      margin: 0,
                    }}
                  >
                    Hagyd üresen a hitelesítő adatokat, ha nem szeretnéd módosítani őket.
                  </p>
                  {CREDENTIAL_FIELDS[provider].map((field) => (
                    <Input
                      key={field}
                      label={`${field} (új érték, opcionális)`}
                      type={
                        field === "password" ||
                        field.includes("token") ||
                        field.includes("key")
                          ? "password"
                          : "text"
                      }
                      value={credentials[field] ?? ""}
                      onChange={(e) =>
                        setCredentials((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                    />
                  ))}
                  <CheckboxField
                    label="Aktív"
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(checked === true)}
                  />
                </>
              ) : (
                CREDENTIAL_FIELDS[provider].map((field) => (
                  <Input
                    key={field}
                    label={field}
                    type={
                      field === "password" ||
                      field.includes("token") ||
                      field.includes("key")
                        ? "password"
                        : "text"
                    }
                    value={credentials[field] ?? ""}
                    onChange={(e) =>
                      setCredentials((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                  />
                ))
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                marginTop: "20px",
              }}
            >
              <Button variant="ghost" onClick={closeModal}>
                Mégse
              </Button>
              <Button
                variant="primary"
                onClick={() =>
                  editTarget ? updateMutation.mutate() : createMutation.mutate()
                }
                style={{ opacity: saving ? 0.6 : 1 }}
              >
                Mentés
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
