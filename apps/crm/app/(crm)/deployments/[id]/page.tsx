"use client";

import { PageHeader, Badge, Button, Card } from "@crm/ui";
import type { Contact, Deployment, DeploymentEvent, DeploymentStatus } from "@crm/types";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import { StepRunner } from "../_components/step-runner";

const statusVariant: Record<
  DeploymentStatus,
  "default" | "info" | "success" | "warning" | "error"
> = {
  draft: "default",
  provisioning: "info",
  live: "success",
  degraded: "error",
  suspended: "warning",
  archived: "default",
};

const statusLabel: Record<DeploymentStatus, string> = {
  draft: "Piszkozat",
  provisioning: "Folyamatban",
  live: "Élő",
  degraded: "Degradált",
  suspended: "Felfüggesztve",
  archived: "Archiválva",
};

const TABS = [
  { id: "overview", label: "Áttekintés" },
  { id: "dns", label: "DNS" },
  { id: "ssl", label: "SSL & Proxy" },
  { id: "stack", label: "Stack" },
  { id: "events", label: "Események" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DeploymentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [events, setEvents] = useState<DeploymentEvent[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const dep = await apiJson<Deployment>(`/api/deployments/${params.id}`);
      setDeployment(dep);
      const c = await apiJson<Contact>(`/api/contacts/${dep.contact_id}`).catch(
        () => null,
      );
      setContact(c);
    } catch {
      setLoadError("A deployment nem található vagy nincs jogosultságod hozzá.");
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (activeTab !== "events" || !deployment) return;
    apiJson<{ items: DeploymentEvent[] }>(`/api/deployments/${deployment._id}/events`)
      .then((res) => setEvents(res.items))
      .catch(() => setEvents([]));
  }, [activeTab, deployment]);

  const runPipeline = async () => {
    if (!deployment) return;
    setRunning(true);
    try {
      const res = await apiJsonBody<{
        ran: string[];
        blocked: string | null;
        deployment: Deployment;
      }>(`/api/deployments/${deployment._id}/run`, "POST", {});
      setDeployment(res.deployment);
      if (res.ran.length > 0) toast.success(`Lefutott lépések: ${res.ran.join(", ")}`);
      if (res.blocked) toast.warning(`Megállt a(z) "${res.blocked}" lépésnél.`);
      if (res.ran.length === 0 && !res.blocked) toast.message("Nincs futtatható lépés.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "A pipeline futtatása sikertelen.");
    } finally {
      setRunning(false);
    }
  };

  const redeploy = async () => {
    if (!deployment) return;
    try {
      const updated = await apiJsonBody<Deployment>(
        `/api/deployments/${deployment._id}/redeploy`,
        "POST",
        {},
      );
      setDeployment(updated);
      toast.success("Redeploy elindítva.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Redeploy sikertelen.");
    }
  };

  const archive = async () => {
    if (!deployment) return;
    if (!confirm("Biztosan archiválod ezt a deploymentet?")) return;
    try {
      const updated = await apiJsonBody<Deployment>(
        `/api/deployments/${deployment._id}`,
        "DELETE",
      );
      setDeployment(updated);
      toast.success("Deployment archiválva.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Archiválás sikertelen.");
    }
  };

  if (loadError) {
    return (
      <Card className="p-8" style={{ textAlign: "center" }}>
        <p style={{ color: "var(--color-status-error, #f87171)" }}>{loadError}</p>
        <Button
          variant="secondary"
          onClick={() => router.push("/deployments")}
          style={{ marginTop: "12px" }}
        >
          Vissza a listához
        </Button>
      </Card>
    );
  }

  if (!deployment) {
    return <p style={{ color: "var(--color-text-muted, #555)" }}>Betöltés...</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title={deployment.name}
        subtitle={deployment.domain}
        actions={
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Badge variant={statusVariant[deployment.status]}>
              {statusLabel[deployment.status]}
            </Badge>
            <Button
              variant="secondary"
              onClick={runPipeline}
              style={{ opacity: running ? 0.6 : 1 }}
            >
              Futtatás
            </Button>
            <Button variant="secondary" onClick={redeploy}>
              Redeploy
            </Button>
            {deployment.status !== "archived" && (
              <Button variant="ghost" onClick={archive}>
                Archiválás
              </Button>
            )}
          </div>
        }
      />

      {contact ? (
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted, #555)" }}>
          Partner:{" "}
          <Link
            href={`/organizations/${contact._id}`}
            style={{ color: "var(--color-accent-primary, #e53935)" }}
          >
            {contact.name}
          </Link>
        </p>
      ) : null}

      <div
        className="flex items-center gap-2 border-b overflow-x-auto pb-[1px]"
        style={{ borderColor: "var(--color-border-subtle, #222)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap"
            style={{
              borderColor:
                activeTab === tab.id
                  ? "var(--color-accent-primary, #e53935)"
                  : "transparent",
              color:
                activeTab === tab.id
                  ? "var(--color-accent-primary, #e53935)"
                  : "var(--color-text-muted, #555)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Card className="p-6">
            <h3 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "12px" }}>
              Pipeline
            </h3>
            <StepRunner deployment={deployment} onChanged={setDeployment} />
          </Card>
        </div>
      )}

      {activeTab === "dns" && (
        <Card className="p-6">
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              rowGap: "10px",
              fontSize: "0.875rem",
            }}
          >
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Cloudflare zone ID</dt>
            <dd style={{ fontFamily: "monospace" }}>
              {deployment.external_ids.cloudflare_zone_id ?? "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Rekord típus</dt>
            <dd>{deployment.dns.record_type}</dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Cél</dt>
            <dd>{deployment.dns.target ?? "—"}</dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Proxied</dt>
            <dd>{deployment.dns.proxied ? "Igen" : "Nem"}</dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>DNS record ID-k</dt>
            <dd style={{ fontFamily: "monospace" }}>
              {deployment.external_ids.cloudflare_dns_record_ids.join(", ") || "—"}
            </dd>
          </dl>
        </Card>
      )}

      {activeTab === "ssl" && (
        <Card className="p-6">
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              rowGap: "10px",
              fontSize: "0.875rem",
            }}
          >
            <dt style={{ color: "var(--color-text-muted, #555)" }}>NPM tanúsítvány ID</dt>
            <dd style={{ fontFamily: "monospace" }}>
              {deployment.external_ids.npm_certificate_id ?? "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>NPM proxy host ID</dt>
            <dd style={{ fontFamily: "monospace" }}>
              {deployment.external_ids.npm_proxy_host_id ?? "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Forward cél</dt>
            <dd>
              {deployment.proxy.forward_scheme}://{deployment.proxy.forward_host ?? "—"}:
              {deployment.proxy.forward_port ?? "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>WebSocket</dt>
            <dd>{deployment.proxy.websocket_support ? "Engedélyezve" : "Kikapcsolva"}</dd>
          </dl>
        </Card>
      )}

      {activeTab === "stack" && (
        <Card className="p-6">
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              rowGap: "10px",
              fontSize: "0.875rem",
            }}
          >
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Stack név</dt>
            <dd>{deployment.stack.stack_name ?? "—"}</dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Portainer stack ID</dt>
            <dd style={{ fontFamily: "monospace" }}>
              {deployment.external_ids.portainer_stack_id ?? "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Webhook ID</dt>
            <dd style={{ fontFamily: "monospace" }}>
              {deployment.external_ids.portainer_webhook_id ?? "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>Image</dt>
            <dd>
              {deployment.image.repository ?? "—"}:{deployment.image.tag ?? "—"}
            </dd>
            <dt style={{ color: "var(--color-text-muted, #555)" }}>GitHub last run</dt>
            <dd style={{ fontFamily: "monospace" }}>
              {deployment.external_ids.github_last_run_id ?? "—"}
            </dd>
          </dl>
        </Card>
      )}

      {activeTab === "events" && (
        <Card className="p-0 overflow-hidden">
          {events.length === 0 ? (
            <p
              style={{
                padding: "32px",
                textAlign: "center",
                color: "var(--color-text-muted, #555)",
              }}
            >
              Nincs esemény.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {events.map((ev) => (
                <div
                  key={ev._id}
                  style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--color-border-subtle, #222)",
                    fontSize: "0.8rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <strong>{ev.kind}</strong>
                    <span style={{ color: "var(--color-text-muted, #555)" }}>
                      {new Date(ev.created_at).toLocaleString("hu-HU")}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      color: "var(--color-text-muted, #555)",
                    }}
                  >
                    {ev.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
