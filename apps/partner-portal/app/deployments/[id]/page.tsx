"use client";

import { PageHeader, Card, Badge, Button } from "@crm/ui";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { apiJson } from "@/lib/api-client";
import { parseDeployment } from "@/lib/entity-parsers";
import type { PartnerSafeDeployment } from "@/lib/deployment-redact";

const statusVariant = {
  draft: "default",
  provisioning: "info",
  live: "success",
  degraded: "error",
  suspended: "warning",
  archived: "default",
} as const;

const statusLabel = {
  draft: "Piszkozat",
  provisioning: "Folyamatban",
  live: "Élő",
  degraded: "Degradált",
  suspended: "Felfüggesztve",
  archived: "Archiválva",
} as const;

const stepLabel: Record<string, string> = {
  cloudflare_zone: "DNS zóna",
  ns_delegation: "Névszerver delegálás",
  dns_records: "DNS rekordok",
  ssl_certificate: "SSL tanúsítvány",
  proxy_host: "Proxy",
  image_build: "Image build",
  stack_create: "Stack létrehozás",
  stack_deploy: "Stack deploy",
};

const stepStatusVariant: Record<
  string,
  "default" | "info" | "success" | "warning" | "error"
> = {
  pending: "default",
  running: "info",
  done: "success",
  failed: "error",
  skipped: "default",
  adopted: "success",
  manual_required: "warning",
};

export default function PartnerDeploymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [deployment, setDeployment] = useState<PartnerSafeDeployment | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown>(`/api/deployments/${id}`, {
          signal: ac.signal,
        });
        setDeployment(parseDeployment(raw));
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("A szolgáltatás nem elérhető.");
      }
    })();
    return () => ac.abort();
  }, [id]);

  if (loadErr) {
    return (
      <Card className="p-8" style={{ textAlign: "center" }}>
        <p style={{ color: "var(--color-status-error, #f87171)" }}>{loadErr}</p>
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
          <Badge variant={statusVariant[deployment.status]}>
            {statusLabel[deployment.status]}
          </Badge>
        }
      />

      <Card className="p-6">
        <h3 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "12px" }}>
          Folyamat
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {deployment.steps.map((step) => (
            <div
              key={step.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid var(--color-border-subtle, #222)",
                fontSize: "0.85rem",
              }}
            >
              <span>{stepLabel[step.key] ?? step.key}</span>
              <Badge variant={stepStatusVariant[step.status] ?? "default"}>
                {step.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {deployment.notes ? (
        <Card className="p-6">
          <h3 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "8px" }}>
            Megjegyzés
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted, #555)" }}>
            {deployment.notes}
          </p>
        </Card>
      ) : null}
    </div>
  );
}
