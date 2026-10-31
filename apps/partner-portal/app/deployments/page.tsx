"use client";

import { PageHeader, Card, Table, Badge } from "@crm/ui";
import type { Column } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function PartnerDeploymentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PartnerSafeDeployment[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown[]>("/api/deployments", { signal: ac.signal });
        setRows(raw.map(parseDeployment));
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("A szolgáltatások nem tölthetők be.");
      }
    })();
    return () => ac.abort();
  }, []);

  const columns: Column<PartnerSafeDeployment>[] = [
    {
      key: "name",
      header: "Név",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>{row.name}</div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-muted, #555)",
              fontFamily: "monospace",
            }}
          >
            {row.domain}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Állapot",
      width: "130px",
      render: (row) => (
        <Badge variant={statusVariant[row.status]}>{statusLabel[row.status]}</Badge>
      ),
    },
    {
      key: "next_billing_at",
      header: "Köv. számlázás",
      width: "140px",
      render: (row) => (
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
          {row.next_billing_at
            ? new Date(row.next_billing_at).toLocaleDateString("hu-HU")
            : "—"}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {loadErr && (
        <p className="text-sm text-red-400 px-1" role="alert">
          {loadErr}
        </p>
      )}

      <PageHeader title="Szolgáltatások" subtitle="A számodra elérhető deploymentek" />

      <Card className="p-0 overflow-hidden">
        <Table<PartnerSafeDeployment>
          data={rows}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/deployments/${row._id}`)}
          emptyMessage="Nincs megjeleníthető szolgáltatás"
        />
      </Card>
    </div>
  );
}
