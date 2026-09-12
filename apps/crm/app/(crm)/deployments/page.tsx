"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { Contact, Deployment, DeploymentStatus } from "@crm/types";
import { Plus, Search, Rocket, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api-client";

type DeploymentRow = Deployment & { contact_name: string };

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

export default function DeploymentsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<DeploymentRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [deployments, contacts] = await Promise.all([
          apiJson<Deployment[]>("/api/deployments", { signal: ac.signal }),
          apiJson<Contact[]>("/api/contacts", { signal: ac.signal }),
        ]);
        const nameById = new Map(contacts.map((c) => [c._id, c.name]));
        setRows(
          deployments.map((d) => ({
            ...d,
            contact_name: nameById.get(d.contact_id) ?? d.contact_id,
          })),
        );
      } catch {
        setLoadError("A deployment lista nem elérhető.");
      }
    })();
    return () => ac.abort();
  }, []);

  const filtered = rows.filter((d) => {
    const needle = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(needle) ||
      d.domain.toLowerCase().includes(needle) ||
      d.deployment_number.toLowerCase().includes(needle) ||
      d.contact_name.toLowerCase().includes(needle)
    );
  });

  const columns: Column<DeploymentRow>[] = [
    {
      key: "deployment_number",
      header: "Azonosító",
      width: "120px",
      render: (row) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "var(--color-text-muted, #555)",
          }}
        >
          {row.deployment_number}
        </span>
      ),
    },
    {
      key: "name",
      header: "Deployment",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>{row.name}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
            {row.domain}
          </div>
        </div>
      ),
    },
    { key: "contact_name", header: "Partner" },
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
      width: "130px",
      render: (row) =>
        row.next_billing_at ? (
          <span style={{ fontSize: "0.8rem" }}>
            {new Date(row.next_billing_at).toLocaleDateString("hu-HU")}
          </span>
        ) : (
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
            —
          </span>
        ),
    },
    {
      key: "updated_at",
      header: "Frissítve",
      width: "130px",
      render: (row) => (
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
          {new Date(row.updated_at).toLocaleDateString("hu-HU")}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <PageHeader
        title="Deploymentek"
        subtitle="Partner site-ok provisioning, DNS, SSL, stack és számlázás egy helyen"
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              variant="secondary"
              onClick={() => router.push("/deployments/import")}
            >
              <Download size={16} style={{ marginRight: "6px" }} />
              Importálás
            </Button>
            <Button variant="primary" onClick={() => router.push("/deployments/new")}>
              <Plus size={16} style={{ marginRight: "6px" }} />
              Új deployment
            </Button>
          </div>
        }
      />

      {loadError ? (
        <p className="text-sm" style={{ color: "var(--color-status-error, #f87171)" }}>
          {loadError}
        </p>
      ) : null}

      <Card className="p-4">
        <div style={{ position: "relative", maxWidth: "360px" }}>
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
            placeholder="Keresés név, domain, azonosító..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "36px" }}
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table<DeploymentRow>
          data={filtered}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/deployments/${row._id}`)}
          emptyMessage="Nincs megjeleníthető deployment"
        />
      </Card>

      {rows.length === 0 && !loadError && (
        <Card className="p-8" style={{ textAlign: "center" }}>
          <Rocket
            size={28}
            style={{ margin: "0 auto 12px", color: "var(--color-text-muted, #555)" }}
          />
          <p style={{ color: "var(--color-text-muted, #555)", marginBottom: "16px" }}>
            Még nincs egyetlen deployment sem.
          </p>
          <Button variant="primary" onClick={() => router.push("/deployments/new")}>
            Első deployment létrehozása
          </Button>
        </Card>
      )}
    </div>
  );
}
