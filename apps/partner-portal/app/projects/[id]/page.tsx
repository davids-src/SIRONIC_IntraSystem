"use client";

import { PageHeader, Card, Button, Badge, Input } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
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
  AlertCircle,
} from "lucide-react";

export default function PartnerProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data
  const project = {
    _id: "p1",
    project_number: "PR-000001",
    type: "network",
    status: "in_progress",
    name: "Új irodaház hálózatépítés",
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    assigned_to: "Kovács János (Projektvezető)",
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
        note: "",
      },
      {
        id: "2",
        label: "Eszközlista igény",
        category: "technical",
        required: true,
        completed: false,
        uploaded: null,
        note: "",
      },
      {
        id: "3",
        label: "Meglévő hálózat dokumentáció",
        category: "documents",
        required: false,
        completed: false,
        uploaded: null,
        note: "",
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
        approval_note: "",
      },
      {
        id: "2",
        label: "Végleges eszközlista",
        url: "https://docs.google.com/...",
        status: "pending",
        approved_by: null,
        date: "2026.04.28.",
        approval_note: "",
      },
    ],
  };

  const tabs = [
    { id: "overview", label: "Áttekintés", icon: <FolderKanban size={16} /> },
    { id: "checklist", label: "Anyagfeltöltés", icon: <UploadCloud size={16} /> },
    {
      id: "staging",
      label: "Megtekintés & Jóváhagyás",
      icon: <CheckCircle2 size={16} />,
    },
    { id: "tickets", label: "Ticketek", icon: <Ticket size={16} /> },
    { id: "worklogs", label: "Munkalapok", icon: <ClipboardList size={16} /> },
    { id: "certificates", label: "Igazolások", icon: <BadgeCheck size={16} /> },
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
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            {project.name}
          </h1>
          <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] mt-2">
            <span>Határidő: {new Date(project.deadline).toLocaleDateString()}</span>
            <span>•</span>
            <span>SIRONIC Kapcsolattartó: {project.assigned_to}</span>
          </div>
        </div>
        <div>
          <Button variant="secondary" onClick={() => router.push("/projects")}>
            Vissza
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
                  Fázisok & Idővonal
                </h3>
                <div className="relative border-l-2 border-[var(--color-border-subtle)] ml-3 space-y-6 pb-2 mt-6">
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
                            className="text-[var(--color-status-error)] fill-[var(--color-status-error)]/20"
                          />
                        </div>
                      ) : (
                        <div className="absolute -left-[9px] top-1 bg-[var(--color-bg-card)] rounded-full">
                          <Circle
                            size={16}
                            className="text-[var(--color-border-default)] opacity-50"
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
                            <div>
                              <Badge variant="error">Aktuális fázis</Badge>
                            </div>
                          )}
                        </div>
                        {phase.status !== "completed" && (
                          <div className="text-xs text-[var(--color-text-muted)] mt-1">
                            Tervezett befejezés: {phase.due_date}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div className="space-y-6">
              <Card className="p-6 space-y-4 bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)] border-[var(--color-border-subtle)]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Figyelmeztetések
                </h3>
                <div className="p-3 bg-[var(--color-status-warning)]/10 border border-[var(--color-status-warning)]/30 rounded-md text-sm text-[var(--color-status-warning)] flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <strong>Hiányzó anyagok!</strong>
                    <p className="mt-1 text-xs opacity-90">
                      Kérjük, töltsd fel a "Eszközlista igény" dokumentumot, hogy
                      folytatni tudjuk a tervezést.
                    </p>
                  </div>
                </div>
              </Card>

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
                      <ClipboardList size={16} /> Kiállított Munkalapok
                    </span>
                    <span className="font-bold">5</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "checklist" && (
          <Card className="p-6 space-y-6">
            <div className="border-b border-[var(--color-border-subtle)] pb-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Kért anyagok és információk
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                A projekt sikeres haladása érdekében kérjük az alábbi elemek feltöltését.
              </p>
            </div>

            <div className="space-y-4">
              {project.checklist.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-[var(--color-bg-secondary)] rounded-md border border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                        {item.label}
                        {item.required && (
                          <span className="text-[10px] uppercase font-bold text-[var(--color-status-error)] bg-[var(--color-status-error)]/10 px-1.5 py-0.5 rounded">
                            Kötelező
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-1 capitalize">
                        Kategória: {item.category}
                      </div>
                    </div>
                    {item.completed ? (
                      <Badge variant="success">
                        <CheckCircle2 size={12} className="mr-1" /> Feltöltve
                      </Badge>
                    ) : (
                      <Badge variant="warning">Hiányzik</Badge>
                    )}
                  </div>

                  {item.completed ? (
                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
                      <Button variant="secondary" className="text-xs h-8">
                        <UploadCloud size={14} className="mr-2" /> {item.uploaded}{" "}
                        letöltése
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-xs h-8 text-[var(--color-status-error)]"
                      >
                        Törlés / Csere
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-[var(--color-border-subtle)]">
                      <div className="border-2 border-dashed border-[var(--color-border-default)] rounded-md p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[var(--color-bg-primary)] transition-colors">
                        <UploadCloud
                          size={24}
                          className="text-[var(--color-text-muted)] mb-2"
                        />
                        <div className="text-sm font-medium">
                          Kattints ide a fájl kiválasztásához
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)] mt-1">
                          vagy húzd ide a fájlt (max 50MB)
                        </div>
                      </div>
                      <div className="mt-3">
                        <Input placeholder="Megjegyzés hozzáfűzése (opcionális)..." />
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button variant="primary">Feltöltés mentése</Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {activeTab === "staging" && (
          <Card className="p-6 space-y-6">
            <div className="border-b border-[var(--color-border-subtle)] pb-4">
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
                Elkészült elemek jóváhagyása
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                Kérjük, tekintsd meg a fejlesztési eredményeket / terveket, és hagyd jóvá
                őket, vagy kérj módosítást.
              </p>
            </div>

            <div className="space-y-4">
              {project.staging_links.map((link) => (
                <div
                  key={link.id}
                  className="p-5 bg-[var(--color-bg-secondary)] rounded-md border border-[var(--color-border-subtle)] space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-base font-bold">{link.label}</div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-1">
                        Küldve: {link.date}
                      </div>
                    </div>
                    <Badge variant={link.status === "approved" ? "success" : "warning"}>
                      {link.status === "approved" ? "Jóváhagyva" : "Jóváhagyásra vár"}
                    </Badge>
                  </div>

                  <div className="p-4 bg-[var(--color-bg-primary)] rounded-md border border-[var(--color-border-subtle)] flex items-center justify-between">
                    <span className="text-sm font-mono text-[var(--color-text-muted)] truncate max-w-[60%]">
                      {link.url}
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => window.open(link.url, "_blank")}
                    >
                      Megtekintés <ExternalLink size={14} className="ml-2" />
                    </Button>
                  </div>

                  {link.status === "pending" && (
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        variant="primary"
                        className="bg-[var(--color-status-success)] text-white hover:bg-[var(--color-status-success)]/90"
                      >
                        <CheckCircle2 size={16} className="mr-2" /> Jóváhagyom
                      </Button>
                      <Button variant="secondary">
                        <MessageSquare size={16} className="mr-2" /> Módosítást kérek
                      </Button>
                    </div>
                  )}

                  {link.status === "approved" && (
                    <div className="text-sm text-[var(--color-status-success)] flex items-center gap-2 pt-2">
                      <CheckCircle2 size={16} />
                      <span>
                        Elfogadva a következő által: <strong>{link.approved_by}</strong>
                      </span>
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
          </Card>
        )}
      </div>
    </div>
  );
}
