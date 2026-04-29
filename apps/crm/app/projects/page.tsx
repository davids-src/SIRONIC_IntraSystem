"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { Project } from "@crm/types";
import {
  Search,
  Filter,
  Plus,
  FolderKanban,
  Clock,
  CheckCircle,
  PauseCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const mockProjects: Project[] = [
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
    contact_id: "Alpha Épület Zrt.",
    created_by: "staff1",
    assigned_to: "Nagy Péter",
    contract_type: "ongoing",
    status: "on_hold",
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
  {
    _id: "p3",
    project_number: "PR-000003",
    tenantId: "tenant1",
    contact_id: "Beta Logisztika Kft.",
    created_by: "staff1",
    assigned_to: "Kovács János",
    contract_type: "project",
    status: "closed",
    name: "Raktár biztonsági rendszer",
    description: "IP kamera és beléptetőrendszer telepítése.",
    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    closed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    budget_hours: 80,
    staging_links: [],
    checklist: [],
    phases: [],
    portal_visible: false,
    category: "Biztonságtechnika",
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const statusVariant = { open: "info", on_hold: "warning", closed: "default" } as const;
const statusLabel = {
  open: "Nyitott",
  on_hold: "Szüneteltetve",
  closed: "Lezárva",
} as const;
const contractLabel = { project: "Projekt", ongoing: "Folyamatos" } as const;

export default function ProjectsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = mockProjects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.project_number.toLowerCase().includes(search.toLowerCase()) ||
      (p.contact_id ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    open: mockProjects.filter((p) => p.status === "open").length,
    on_hold: mockProjects.filter((p) => p.status === "on_hold").length,
    closed: mockProjects.filter((p) => p.status === "closed").length,
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
      header: "Projekt",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>{row.name}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
            {row.contact_id ?? "—"} · {row.category ?? ""}
          </div>
        </div>
      ),
    },
    {
      key: "contract_type",
      header: "Típus",
      width: "110px",
      render: (row) => (
        <Badge variant="default">
          {contractLabel[row.contract_type as keyof typeof contractLabel] ??
            row.contract_type}
        </Badge>
      ),
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
    {
      key: "assigned_to",
      header: "Felelős",
      width: "130px",
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
      header: "Határidő",
      width: "110px",
      render: (row) => {
        if (!row.deadline)
          return <span style={{ color: "var(--color-text-muted, #555)" }}>—</span>;
        const d = new Date(row.deadline);
        const overdue = d < new Date() && row.status !== "closed";
        return (
          <span
            style={{
              fontSize: "0.8rem",
              color: overdue ? "#e53935" : "var(--color-text-primary, #fff)",
            }}
          >
            {d.toLocaleDateString("hu-HU")}
          </span>
        );
      },
    },
    {
      key: "budget_hours",
      header: "Budget",
      width: "80px",
      render: (row) => (
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
          {row.budget_hours ? `${row.budget_hours}h` : "—"}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="Projektek"
        subtitle="Ügyfélprojektek és folyamatos szerződések menedzselése"
        actions={
          <Button variant="primary" onClick={() => router.push("/projects/new")}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új projekt
          </Button>
        }
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
            label: "Nyitott",
            count: counts.open,
            icon: <FolderKanban size={16} />,
            color: "#3b82f6",
          },
          {
            label: "Szüneteltetve",
            count: counts.on_hold,
            icon: <PauseCircle size={16} />,
            color: "#f59e0b",
          },
          {
            label: "Lezárva",
            count: counts.closed,
            icon: <CheckCircle size={16} />,
            color: "#6b7280",
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
          <Button variant="secondary">
            <Filter size={15} style={{ marginRight: "6px" }} />
            Szűrők
          </Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table<Project>
          data={filtered}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/projects/${row._id}`)}
          emptyMessage="Nincs találat a keresési feltételekre"
        />
      </Card>
    </div>
  );
}
