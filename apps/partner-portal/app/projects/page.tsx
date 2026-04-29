"use client";

import { PageHeader, Card, Badge, Button, Input } from "@crm/ui";
import type { Project } from "@crm/types";
import {
  Search,
  Filter,
  FolderKanban,
  Calendar,
  Ticket,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Mock data
const mockProjects = [
  {
    _id: "p1",
    project_number: "PR-000001",
    type: "network",
    status: "in_progress",
    name: "Új irodaház hálózatépítés",
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 40, // 40% based on phases
    checklist_done: 1,
    checklist_total: 3,
    open_tickets: 2,
    current_phase: "Telepítés",
  },
  {
    _id: "p2",
    project_number: "PR-000002",
    type: "web",
    status: "planning",
    name: "Céges weboldal megújítása",
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 10,
    checklist_done: 0,
    checklist_total: 5,
    open_tickets: 0,
    current_phase: "Tervezés",
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
  in_progress: "Kivitelezés folyamatban",
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

export default function PartnerProjectsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projektjeim"
        subtitle="Aktuális és lezárt projektek áttekintése, dokumentációk feltöltése"
      />

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full max-w-md relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            size={16}
          />
          <Input label="" placeholder="Keresés a projektek között..." className="pl-9" />
        </div>
        <Button variant="secondary" className="w-full sm:w-auto">
          <Filter size={16} className="mr-2" />
          Szűrők
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockProjects.map((project) => (
          <Card
            key={project._id}
            className="p-6 cursor-pointer hover:border-[var(--color-border-hover)] transition-all group relative overflow-hidden"
            onClick={() => router.push(`/projects/${project._id}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="font-mono text-[10px]">
                <Badge variant="default">{project.project_number}</Badge>
              </div>
              <Badge variant={statusColorMap[project.status]}>
                {statusLabels[project.status]}
              </Badge>
            </div>

            <h3 className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors mb-2 line-clamp-2">
              {project.name}
            </h3>

            <div className="text-sm text-[var(--color-text-muted)] mb-6">
              {typeLabels[project.type]}
            </div>

            {/* Progress Bar */}
            <div className="mb-6 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[var(--color-text-secondary)]">
                  Fázis: {project.current_phase}
                </span>
                <span className="font-bold">{project.progress}%</span>
              </div>
              <div className="h-2 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-accent-primary)] rounded-full transition-all duration-500"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            {/* Footer Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--color-border-subtle)]">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] flex items-center gap-1">
                  <Calendar size={12} /> Határidő
                </span>
                <span className="text-sm font-medium">
                  {new Date(project.deadline).toLocaleDateString()}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] flex items-center gap-1">
                  <CheckCircle2 size={12} /> Anyagok
                </span>
                <span
                  className={`text-sm font-medium ${project.checklist_done === project.checklist_total ? "text-[var(--color-status-success)]" : ""}`}
                >
                  {project.checklist_done} / {project.checklist_total}
                </span>
              </div>
            </div>

            {project.open_tickets > 0 && (
              <div className="absolute top-0 right-0 -mr-1 -mt-1 bg-[var(--color-status-error)] text-[var(--color-bg-primary)] text-xs font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg flex items-center gap-1">
                <Ticket size={12} /> {project.open_tickets} nyitott
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
