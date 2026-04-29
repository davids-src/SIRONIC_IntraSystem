"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Project } from "@crm/types";
import { Search, Filter, Plus, Edit, FolderKanban } from "lucide-react";
import { useRouter } from "next/navigation";

// Mock data
const mockProjects: Project[] = [
  {
    _id: "p1",
    project_number: "PR-000001",
    tenantId: "tenant1",
    organization_id: "Acme Kft.", // Mocked as name for now
    created_by: "staff1",
    assigned_to: "Kovács János",
    type: "network",
    contract_type: "project",
    status: "in_progress",
    name: "Új irodaház hálózatépítés",
    description: "Komplett hálózati infrastruktúra kialakítása az új irodában.",
    start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    closed_at: null,
    budget_hours: 120,
    total_logged_hours: 45,
    staging_links: [],
    material_checklist: [],
    phases: [],
    portal_visible: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    _id: "p2",
    project_number: "PR-000002",
    tenantId: "tenant1",
    organization_id: "GlobalTech Zrt.",
    created_by: "staff1",
    assigned_to: "Nagy Péter",
    type: "web",
    contract_type: "ongoing",
    status: "live",
    name: "Weboldal karbantartás 2024",
    description: "Éves karbantartási szerződés a weboldalhoz.",
    start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
    closed_at: null,
    budget_hours: 50,
    total_logged_hours: 12,
    staging_links: [],
    material_checklist: [],
    phases: [],
    portal_visible: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const statusColorMap: Record<
  string,
  "success" | "warning" | "error" | "info" | "default"
> = {
  planning: "default",
  in_progress: "info",
  review: "warning",
  live: "success",
  closed: "default",
  on_hold: "error",
};

const statusLabels: Record<string, string> = {
  planning: "Tervezés",
  in_progress: "Kivitelezés",
  review: "Ellenőrzés",
  live: "Éles",
  closed: "Lezárva",
  on_hold: "Szüneteltetve",
};

const typeLabels: Record<string, string> = {
  network: "Hálózatépítés",
  web: "Webfejlesztés",
  security: "Biztonságtechnika",
  nis2: "NIS2 megfelelőség",
  it_support: "IT üzemeltetés",
  other: "Egyéb",
};

export default function ProjectsPage() {
  const router = useRouter();

  const columns = [
    {
      key: "id",
      header: "ID",
      accessor: (row: Project) => (
        <span className="font-mono text-xs">{row.project_number}</span>
      ),
    },
    {
      key: "name",
      header: "Projekt",
      accessor: (row: Project) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {row.organization_id}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Típus",
      accessor: (row: Project) => (
        <Badge variant="default">{typeLabels[row.type] || row.type}</Badge>
      ),
    },
    {
      key: "status",
      header: "Állapot",
      accessor: (row: Project) => (
        <Badge variant={statusColorMap[row.status]}>
          {statusLabels[row.status] || row.status}
        </Badge>
      ),
    },
    {
      key: "assigned",
      header: "Felelős",
      accessor: (row: Project) => row.assigned_to || "-",
    },
    {
      key: "progress",
      header: "Haladás",
      accessor: (row: Project) => {
        if (!row.budget_hours) return "-";
        const percent = Math.min(
          100,
          Math.round((row.total_logged_hours / row.budget_hours) * 100),
        );
        return (
          <div className="w-full max-w-[120px]">
            <div className="flex justify-between text-xs mb-1">
              <span>{row.total_logged_hours}h</span>
              <span className="text-[var(--color-text-muted)]">{row.budget_hours}h</span>
            </div>
            <div className="h-2 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent-primary)] rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "deadline",
      header: "Határidő",
      accessor: (row: Project) =>
        row.deadline ? new Date(row.deadline).toLocaleDateString() : "-",
    },
    {
      key: "actions",
      header: "",
      accessor: (row: Project) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            className="p-2 h-8 w-8"
            onClick={() => router.push(`/projects/${row._id}`)}
          >
            <Edit size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projektek"
        subtitle="Ügyfélprojektek és folyamatos szerződések menedzselése"
        actions={
          <Button variant="primary" onClick={() => router.push("/projects/new")}>
            <Plus size={16} className="mr-2" />
            Új projekt
          </Button>
        }
      />

      <Card className="p-4 space-y-4">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              size={16}
            />
            <Input
              label="Keresés"
              placeholder="Projekt név, ID vagy szervezet..."
              className="pl-9"
            />
          </div>
          <Button variant="secondary" className="w-full sm:w-auto">
            <Filter size={16} className="mr-2" />
            Szűrők
          </Button>
        </div>

        {/* Table */}
        <Table
          data={mockProjects as any[]}
          columns={columns as any[]}
          keyField="_id"
          emptyMessage="Nincs megjeleníthető projekt"
        />
      </Card>
    </div>
  );
}
