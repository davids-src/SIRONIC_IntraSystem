"use client";

import { PageHeader, Card, Button, Badge, Input, colors, radius } from "@crm/ui";
import { RefreshCw, Search, ExternalLink, Plus, Globe, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiJsonBody, ApiError } from "@/lib/api-client";

type DnsRecordInfo = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
};

type DomainRow = {
  domain: string;
  cloudflare_zone_id?: string;
  cloudflare_zone_status?: string;
  dns_records?: DnsRecordInfo[];
  npm_proxy_host_id?: number;
  npm_certificate_id?: number;
  npm_forward_host?: string;
  npm_forward_port?: number;
  portainer_stack_id?: number;
  suggested_stack_name?: string;
  stack_match_method?: "container" | "fuzzy_name";
  already_imported_deployment_id?: string;
  confidence: "high" | "medium" | "low";
};

const IMPORT_HANDOFF_KEY = "sironic_import_candidate";

export default function DomainsOverviewPage() {
  const router = useRouter();
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [scannedAt, setScannedAt] = useState<Date | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmImportAll, setConfirmImportAll] = useState(false);

  const runScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiJsonBody<{ candidates: DomainRow[]; warnings: string[] }>(
        "/api/deployments/import/scan",
        "POST",
        {},
      );
      setRows(res.candidates);
      setWarnings(res.warnings);
      setScannedAt(new Date());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Az átvizsgálás sikertelen.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startImport = (c: DomainRow) => {
    sessionStorage.setItem(IMPORT_HANDOFF_KEY, JSON.stringify(c));
    router.push("/deployments/import");
  };

  const importAll = async () => {
    const pending = rows.filter((r) => !r.already_imported_deployment_id);
    if (pending.length === 0) return;
    setConfirmImportAll(false);
    setBulkBusy(true);
    try {
      const res = await apiJsonBody<{
        created: { domain: string; deployment_id: string }[];
        skipped: { domain: string; reason: string }[];
      }>("/api/deployments/import/bulk-apply", "POST", {});
      toast.success(
        `${res.created.length} deployment importálva${
          res.skipped.length ? `, ${res.skipped.length} kihagyva` : ""
        }.`,
      );
      await runScan();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "A tömeges importálás sikertelen.");
    } finally {
      setBulkBusy(false);
    }
  };

  const needle = search.trim().toLowerCase();
  const filtered = needle
    ? rows.filter((r) => r.domain.toLowerCase().includes(needle))
    : rows;

  const withoutDeployment = rows.filter((r) => !r.already_imported_deployment_id).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <PageHeader
        title="Domainek"
        subtitle="Minden Cloudflare / Nginx Proxy Manager / Portainer domain egy helyen — függetlenül attól, van-e hozzá deployment"
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              variant="secondary"
              onClick={runScan}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <RefreshCw size={16} style={{ marginRight: "6px" }} />
              {loading ? "Frissítés..." : "Frissítés"}
            </Button>
            {withoutDeployment > 0 && (
              <Button
                variant="primary"
                onClick={() => setConfirmImportAll(true)}
                style={{ opacity: bulkBusy ? 0.6 : 1 }}
              >
                <Zap size={16} style={{ marginRight: "6px" }} />
                {bulkBusy ? "Importálás..." : `Mindent importál (${withoutDeployment})`}
              </Button>
            )}
          </div>
        }
      />

      {confirmImportAll && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            padding: "16px",
          }}
          onClick={() => setConfirmImportAll(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              backgroundColor: colors.bg.card,
              border: `1px solid ${colors.border.subtle}`,
              borderRadius: radius.lg,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
              Mindent importál
            </h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: colors.text.muted }}>
              Kb. {rows.filter((r) => !r.already_imported_deployment_id).length}{" "}
              deployment jön létre automatikusan, a felismert Cloudflare/NPM/Portainer
              azonosítókkal (adopted lépésekkel, &quot;live&quot; státusszal, partner
              nélkül). A pontos szám a futás után jelenik meg. Folytatod?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <Button variant="secondary" onClick={() => setConfirmImportAll(false)}>
                Mégse
              </Button>
              <Button variant="primary" onClick={importAll}>
                Importálás
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          padding: "12px 16px",
          borderRadius: "8px",
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.2)",
          fontSize: "0.82rem",
          color: "var(--color-text-muted, #aaa)",
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
        }}
      >
        <Globe size={15} style={{ marginTop: "1px", flexShrink: 0, color: "#60a5fa" }} />
        <span>
          Nem minden domainhez tartozik deployment, és ez így is helyes — ez a nézet csak
          láthatóságot ad. A{" "}
          <strong style={{ color: "#e2e8f0" }}>stack: container-egyezés</strong> jelzés
          azt jelenti, hogy a reverse proxy mögötti konténert megtaláltuk és onnan
          biztosan tudjuk, melyik Portainer stack szolgálja ki a domaint.
        </span>
      </div>

      {error ? (
        <p className="text-sm" style={{ color: "var(--color-status-error, #f87171)" }}>
          {error}
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted, #777)" }}>
          Figyelmeztetés: {warnings.join("; ")}
        </p>
      ) : null}

      <Card className="p-4">
        <div
          style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}
        >
          <div style={{ position: "relative", maxWidth: "320px", flex: 1 }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-text-muted, #555)",
                pointerEvents: "none",
              }}
            />
            <Input
              label=""
              placeholder="Keresés domain alapján..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>
          <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted, #777)" }}>
            {rows.length} domain összesen · {withoutDeployment} nincs deploymenthez kötve
            {scannedAt
              ? ` · utolsó frissítés: ${scannedAt.toLocaleTimeString("hu-HU")}`
              : ""}
          </span>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filtered.length === 0 && !loading ? (
          <Card className="p-8" style={{ textAlign: "center" }}>
            <p style={{ color: "var(--color-text-muted, #555)" }}>Nincs találat.</p>
          </Card>
        ) : (
          filtered.map((r) => (
            <Card key={r.domain} className="p-4">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    minWidth: "200px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontFamily: "monospace",
                        fontSize: "0.9rem",
                      }}
                    >
                      {r.domain}
                    </span>
                    {r.cloudflare_zone_status ? (
                      <Badge
                        variant={
                          r.cloudflare_zone_status === "active" ? "success" : "warning"
                        }
                      >
                        {r.cloudflare_zone_status}
                      </Badge>
                    ) : null}
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--color-text-muted, #777)",
                    }}
                  >
                    {r.dns_records?.length
                      ? r.dns_records
                          .map(
                            (d) =>
                              `${d.type} ${d.name === r.domain ? "@" : d.name} → ${d.content}`,
                          )
                          .join(" · ")
                      : "Nincs DNS rekord adat"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--color-text-muted, #777)",
                    }}
                  >
                    {r.npm_forward_host
                      ? `Proxy → ${r.npm_forward_host}:${r.npm_forward_port ?? "?"}`
                      : "Nincs NPM proxy host"}
                    {r.suggested_stack_name
                      ? ` · Stack: ${r.suggested_stack_name} (${
                          r.stack_match_method === "container"
                            ? "container-egyezés"
                            : "név-egyezés"
                        })`
                      : ""}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Badge
                    variant={
                      r.confidence === "high"
                        ? "success"
                        : r.confidence === "medium"
                          ? "info"
                          : "default"
                    }
                  >
                    {r.confidence}
                  </Badge>
                  {r.already_imported_deployment_id ? (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        router.push(`/deployments/${r.already_imported_deployment_id}`)
                      }
                    >
                      <ExternalLink size={14} style={{ marginRight: "6px" }} />
                      Megnyitás
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={() => startImport(r)}>
                      <Plus size={14} style={{ marginRight: "6px" }} />
                      Deployment létrehozása
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
