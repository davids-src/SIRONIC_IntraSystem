"use client";

import { PageHeader, Card, Button, Badge, Table, Input } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Edit,
  FolderKanban,
  CheckCircle2,
  Circle,
  UploadCloud,
  Link as LinkIcon,
  Ticket,
  ClipboardList,
  BadgeCheck,
  ExternalLink,
  MessageSquare,
  Plus,
} from "lucide-react";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data
  const project = {
    _id: "p1",
    project_number: "PR-000001",
    organization_id: "Acme Kft.",
    type: "network",
    status: "in_progress",
    name: "Új irodaház hálózatépítés",
    description: "Komplett hálózati infrastruktúra kialakítása az új irodában.",
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    assigned_to: "Kovács János",
    budget_hours: 120,
    total_logged_hours: 45,
    phases: [
      { name: "Felmérés", status: "completed", due_date: "2026-04-10" },
      { name: "Tervezés", status: "completed", due_date: "2026-04-15" },
      { name: "Telepítés", status: "in_progress", due_date: "2026-05-10" },
      { name: "Tesztelés", status: "pending", due_date: "2026-05-20" },
      { name: "Átadás", status: "pending", due_date: "2026-05-25" },
    ],
    checklist: [
      {
        id: "1",
        label: "Helyszínrajz / alaprajz",
        category: "documents",
        required: true,
        completed: true,
        uploaded: "alaprajz_v2.pdf",
      },
      {
        id: "2",
        label: "Eszközlista igény",
        category: "technical",
        required: true,
        completed: false,
        uploaded: null,
      },
      {
        id: "3",
        label: "Meglévő hálózat dokumentáció",
        category: "documents",
        required: false,
        completed: false,
        uploaded: null,
      },
    ],
    staging_links: [
      {
        id: "1",
        label: "Hálózati tervek (PDF)",
        url: "https://docs.google.com/...",
        status: "approved",
        approved_by: "Nagy Péter",
        date: "2026.04.16.",
      },
      {
        id: "2",
        label: "Végleges eszközlista",
        url: "https://docs.google.com/...",
        status: "pending",
        approved_by: null,
        date: "2026.04.28.",
      },
    ],
  };

  const tabs = [
    { id: "overview", label: "Áttekintés", icon: <FolderKanban size={16} /> },
    { id: "checklist", label: "Anyaggyűjtés", icon: <CheckCircle2 size={16} /> },
    { id: "staging", label: "Staging linkek", icon: <LinkIcon size={16} /> },
    { id: "tickets", label: "Ticketek", icon: <Ticket size={16} /> },
    { id: "worklogs", label: "Munkalapok", icon: <ClipboardList size={16} /> },
    {
      id: "certificates",
      label: "Teljesítési igazolások",
      icon: <BadgeCheck size={16} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="font-mono">
              <Badge variant="default">{project.project_number}</Badge>
            </div>
            <Badge variant="info">Kivitelezés (In Progress)</Badge>
            <Badge variant="default">Hálózatépítés</Badge>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {project.name}
          </h1>
          <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] mt-2">
            <span>
              Ügyfél:{" "}
              <strong className="text-[var(--color-text-primary)]">
                {project.organization_id}
              </strong>
            </span>
            <span>•</span>
            <span>Felelős: {project.assigned_to}</span>
            <span>•</span>
            <span>Határidő: {new Date(project.deadline).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push("/projects")}>
            Vissza
          </Button>
          <Button variant="primary">
            <Edit size={16} className="mr-2" /> Szerkesztés
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] overflow-x-auto pb-[1px]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-default)]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Leírás
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {project.description}
                </p>

                <div className="pt-4 mt-4 border-t border-[var(--color-border-subtle)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Haladás (Időkeret)</span>
                    <span className="text-sm font-bold">
                      {project.total_logged_hours}h / {project.budget_hours}h
                    </span>
                  </div>
                  <div className="h-3 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-accent-primary)] rounded-full"
                      style={{
                        width: `${Math.round((project.total_logged_hours / project.budget_hours) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Fázisok & Idővonal
                </h3>
                <div className="relative border-l-2 border-[var(--color-border-subtle)] ml-3 space-y-6 pb-2">
                  {project.phases.map((phase, idx) => (
                    <div key={idx} className="relative pl-6">
                      {phase.status === "completed" ? (
                        <div className="absolute -left-[9px] top-1 bg-[var(--color-bg-card)] rounded-full">
                          <CheckCircle2
                            size={16}
                            className="text-[var(--color-status-success)]"
                          />
                        </div>
                      ) : phase.status === "in_progress" ? (
                        <div className="absolute -left-[9px] top-1 bg-[var(--color-bg-card)] rounded-full">
                          <Circle
                            size={16}
                            className="text-[var(--color-accent-primary)] fill-[var(--color-accent-primary)]"
                          />
                        </div>
                      ) : (
                        <div className="absolute -left-[9px] top-1 bg-[var(--color-bg-card)] rounded-full">
                          <Circle
                            size={16}
                            className="text-[var(--color-border-default)]"
                          />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-bold ${phase.status === "pending" ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]"}`}
                          >
                            {phase.name}
                          </span>
                          {phase.status === "in_progress" && (
                            <Badge variant="info">Aktuális</Badge>
                          )}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] mt-1">
                          Határidő: {phase.due_date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="space-y-6">
              <Card className="p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Gyors statisztikák
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-md">
                    <span className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
                      <Ticket size={16} /> Nyitott Ticketek
                    </span>
                    <span className="font-bold">2</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-md">
                    <span className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
                      <ClipboardList size={16} /> Munkalapok
                    </span>
                    <span className="font-bold">5</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] rounded-md">
                    <span className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
                      <BadgeCheck size={16} /> Igazolások
                    </span>
                    <span className="font-bold">1</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "checklist" && (
          <Card className="p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Anyaggyűjtés
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  1 / 3 kötelező elem feltöltve
                </p>
              </div>
              <Button variant="secondary">
                <Plus size={16} className="mr-2" /> Új elem
              </Button>
            </div>

            <div className="space-y-3">
              {project.checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-[var(--color-bg-secondary)] rounded-md border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-primary)]">
                      {item.completed ? (
                        <CheckCircle2
                          size={20}
                          className="text-[var(--color-status-success)]"
                        />
                      ) : (
                        <Circle size={20} />
                      )}
                    </button>
                    <div>
                      <div className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                        {item.label}
                        {item.required && (
                          <span className="text-[10px] uppercase font-bold text-[var(--color-status-error)] bg-[var(--color-status-error)]/10 px-1.5 py-0.5 rounded">
                            Kötelező
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-1 capitalize">
                        {item.category}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.uploaded ? (
                      <div className="cursor-pointer hover:opacity-80">
                        <Badge variant="success">
                          <UploadCloud size={12} className="mr-1 inline" />{" "}
                          {item.uploaded}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--color-text-muted)] italic">
                        Nincs feltöltve
                      </span>
                    )}
                    <Button variant="ghost" className="p-2 h-8 w-8 ml-2">
                      <MessageSquare size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === "staging" && (
          <Card className="p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Megtekintési Linkek (Staging)
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  Küldj linkeket a partnernek jóváhagyásra.
                </p>
              </div>
              <Button variant="primary">
                <Plus size={16} className="mr-2" /> Új link
              </Button>
            </div>

            <div className="space-y-4">
              {project.staging_links.map((link) => (
                <div
                  key={link.id}
                  className="p-4 bg-[var(--color-bg-secondary)] rounded-md border border-[var(--color-border-subtle)] space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-bold">{link.label}</div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[var(--color-accent-primary)] hover:underline flex items-center gap-1 mt-1"
                      >
                        {link.url} <ExternalLink size={10} />
                      </a>
                    </div>
                    <Badge variant={link.status === "approved" ? "success" : "warning"}>
                      {link.status === "approved" ? "Jóváhagyva" : "Jóváhagyásra vár"}
                    </Badge>
                  </div>
                  {link.status === "approved" && (
                    <div className="text-xs text-[var(--color-text-muted)] pt-2 border-t border-[var(--color-border-subtle)]">
                      Jóváhagyta: <strong>{link.approved_by}</strong> ({link.date})
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {(activeTab === "tickets" ||
          activeTab === "worklogs" ||
          activeTab === "certificates") && (
          <Card className="p-6 min-h-[300px] flex flex-col items-center justify-center text-[var(--color-text-muted)]">
            <FolderKanban size={48} className="mb-4 opacity-50" />
            <h2 className="text-lg font-medium text-[var(--color-text-primary)]">
              Kapcsolódó{" "}
              {activeTab === "tickets"
                ? "Ticketek"
                : activeTab === "worklogs"
                  ? "Munkalapok"
                  : "Igazolások"}
            </h2>
            <p className="text-sm mt-2 text-center max-w-md">
              Itt fognak megjelenni a projekthez csatolt{" "}
              {activeTab === "tickets"
                ? "ticketek"
                : activeTab === "worklogs"
                  ? "munkalapok"
                  : "teljesítési igazolások"}{" "}
              listája.
            </p>
            <Button variant="secondary" className="mt-6">
              <Plus size={16} className="mr-2" /> Új hozzáadása
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
