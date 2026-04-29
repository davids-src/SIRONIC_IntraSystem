"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { Project } from "@crm/types";
import { Search, Filter, FolderKanban, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const myProjects: Project[] = [
  {
    _id: "p1",
    project_number: "PR-000001",
    tenantId: "tenant1",
    contact_id: "Tech Solutions Kft.",
    created_by: "staff1",
    assigned_to: "Kovács János",
    contract_type: "project",
    status: "open",
    name: "Új irodaház hálózatépítés",
    description: "Komplett hálózati infrastruktúra kialakítása az új irodában.",
    start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    closed_at: null,
    budget_hours: 120,
    staging_links: [],
    checklist: [],
    phases: [],
    portal_visible: true,
    category: "Hálózatépítés",
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    _id: "p2",
    project_number: "PR-000002",
    tenantId: "tenant1",
    contact_id: "Tech Solutions Kft.",
    created_by: "staff1",
    assigned_to: "Nagy Péter",
    contract_type: "ongoing",
    status: "open",
    name: "Weboldal karbantartás 2024",
    description: "Éves karbantartási szerződés a weboldalhoz.",
    start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
    closed_at: null,
    budget_hours: 50,
    staging_links: [],
    checklist: [],
    phases: [],
    portal_visible: true,
    category: "Webfejlesztés",
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const statusVariant = { open: "info", on_hold: "warning", closed: "default" } as const;
const statusLabel = {
  open: "Folyamatban",
  on_hold: "Szüneteltetve",
  closed: "Lezárva",
} as const;

export default function PartnerProjectsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = myProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.project_number.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    total: myProjects.length,
    open: myProjects.filter((p) => p.status === "open").length,
    closed: myProjects.filter((p) => p.status === "closed").length,
  };

  const columns: Column<Project>[] = [
    {
      key: "project_number",
      header: "ID",
      width: "110px",
      render: (row) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "var(--color-text-muted, #555)",
          }}
        >
          {row.project_number}
        </span>
      ),
    },
    {
      key: "name",
      header: "Projekt neve",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>{row.name}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
            {row.category ?? "Egyéb"}
          </div>
        </div>
      ),
    },
    {
      key: "assigned_to",
      header: "Projektmenedzser",
      width: "180px",
      render: (row) => (
        <span
          style={{ fontSize: "0.825rem", color: "var(--color-text-secondary, #a0a0a0)" }}
        >
          {row.assigned_to || "—"}
        </span>
      ),
    },
    {
      key: "deadline",
      header: "Tervezett befejezés",
      width: "160px",
      render: (row) => {
        if (!row.deadline)
          return <span style={{ color: "var(--color-text-muted, #555)" }}>—</span>;
        return (
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-primary, #fff)" }}>
            {new Date(row.deadline).toLocaleDateString("hu-HU")}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Állapot",
      width: "130px",
      render: (row) => (
        <Badge
          variant={statusVariant[row.status as keyof typeof statusVariant] ?? "default"}
        >
          {statusLabel[row.status as keyof typeof statusLabel] ?? row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="Projektek"
        subtitle="Folyamatban lévő fejlesztések és szerződések állapota"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
        }}
      >
        {[
          {
            label: "Összes projekt",
            count: counts.total,
            icon: <FolderKanban size={16} />,
            color: "#6b7280",
          },
          {
            label: "Folyamatban",
            count: counts.open,
            icon: <Clock size={16} />,
            color: "#3b82f6",
          },
          {
            label: "Lezárva",
            count: counts.closed,
            icon: <CheckCircle size={16} />,
            color: "#22c55e",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--color-text-muted, #555)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {stat.label}
              </span>
              <span style={{ color: stat.color }}>{stat.icon}</span>
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "var(--color-text-primary, #fff)",
                lineHeight: 1,
              }}
            >
              {stat.count}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
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
              placeholder="Keresés projektben..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table<Project>
          data={filtered}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/projects/${row._id}`)}
          emptyMessage="Nincs megjeleníthető projekt"
        />
      </Card>
    </div>
  );
}
