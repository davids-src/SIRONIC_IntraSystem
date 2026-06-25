"use client";

import { Card, Button, Badge } from "@crm/ui";
import { useRouter } from "next/navigation";
import { useState, use, useEffect, useCallback } from "react";
import type { Project, StagingLink } from "@crm/types";
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
  FileSignature,
  AlertTriangle,
  X,
  ArrowLeft,
  Clock,
  User,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

function parseProject(raw: unknown): Project {
  const p = raw as Record<string, unknown>;
  return {
    ...(p as unknown as Project),
    start_date: p["start_date"] ? new Date(String(p["start_date"])) : null,
    deadline: p["deadline"] ? new Date(String(p["deadline"])) : null,
    closed_at: p["closed_at"] ? new Date(String(p["closed_at"])) : null,
    created_at: new Date(String(p["created_at"])),
    updated_at: new Date(String(p["updated_at"])),
    phases: ((p["phases"] as Project["phases"]) ?? []).map((ph) => ({
      ...ph,
      due_date: ph.due_date ? new Date(String(ph.due_date)) : null,
      completed_at: ph.completed_at ? new Date(String(ph.completed_at)) : null,
    })),
    staging_links: ((p["staging_links"] as StagingLink[]) ?? []).map((sl) => ({
      ...sl,
      added_at: new Date(String(sl.added_at)),
      approved_at: sl.approved_at ? new Date(String(sl.approved_at)) : null,
    })),
    checklist: ((p["checklist"] as Project["checklist"]) ?? []).map((c) => ({
      ...c,
      completed_at: c.completed_at ? new Date(String(c.completed_at)) : null,
    })),
    required_items: ((p["required_items"] as Project["required_items"]) ?? []).map(
      (ri) => ({
        ...ri,
      }),
    ),
  };
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("overview");
  const [contractWarningDismissed, setContractWarningDismissed] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [contactName, setContactName] = useState<string>("—");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ticketCount, setTicketCount] = useState(0);
  const [worklogCount, setWorklogCount] = useState(0);
  const [certCount, setCertCount] = useState(0);
  const [contractCount, setContractCount] = useState(0);
  const [totalLoggedHours, setTotalLoggedHours] = useState(0);
  const [closing, setClosing] = useState(false);
  const [priceList, setPriceList] = useState<any[]>([]);
  const [loadingPriceList, setLoadingPriceList] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [showReserveModal, setShowReserveModal] = useState<any | null>(null);
  const [reserveQty, setReserveQty] = useState(0);
  const [stockItemDoc, setStockItemDoc] = useState<any | null>(null);
  const [loadingStockInfo, setLoadingStockInfo] = useState(false);
  const [reservingStock, setReservingStock] = useState(false);

  const reload = useCallback(async () => {
    try {
      const raw = await apiJson<unknown>(`/api/projects/${id}`);
      const pr = parseProject(raw);
      setProject(pr);
      setContractWarningDismissed(pr.contract_warning_dismissed);
      setLoadError(null);
      if (pr.contact_id) {
        try {
          const c = await apiJson<{ name: string }>(`/api/contacts/${pr.contact_id}`);
          setContactName(c.name);
        } catch {
          setContactName("—");
        }
      } else {
        setContactName("—");
      }
      const [tickets, worklogs, certs, contracts] = await Promise.all([
        apiJson<unknown[]>(`/api/tickets?project_id=${encodeURIComponent(id)}`),
        apiJson<unknown[]>(`/api/worklogs?project_id=${encodeURIComponent(id)}`),
        apiJson<unknown[]>(
          `/api/completion-certificates?project_id=${encodeURIComponent(id)}`,
        ),
        apiJson<unknown[]>(`/api/contracts?project_id=${encodeURIComponent(id)}`),
      ]);
      setTicketCount(tickets.length);
      setWorklogCount(worklogs.length);
      setCertCount(certs.length);
      setContractCount(contracts.length);
      let hours = 0;
      for (const w of worklogs) {
        const row = w as { items?: { quantity: number; unit: string }[] };
        for (const it of row.items ?? []) {
          if (it.unit === "óra") {
            hours += it.quantity;
          }
        }
      }
      setTotalLoggedHours(hours);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setLoadError("A projekt nem található.");
      } else {
        setLoadError("A projekt betöltése sikertelen.");
      }
      setProject(null);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const dismissContractWarning = async () => {
    try {
      await apiJsonBody(`/api/projects/${id}`, "PATCH", {
        contract_warning_dismissed: true,
      });
      setContractWarningDismissed(true);
    } catch {
      setContractWarningDismissed(true);
    }
  };

  const togglePhase = async (phaseIdx: number) => {
    if (!project) return;
    const cycle: Record<string, string> = {
      pending: "in_progress",
      in_progress: "completed",
      completed: "pending",
    };
    const newPhases = project.phases.map((ph, i) => {
      if (i !== phaseIdx) return ph;
      const nextStatus = cycle[ph.status] ?? "pending";
      return {
        ...ph,
        status: nextStatus as "pending" | "in_progress" | "completed",
        completed_at: nextStatus === "completed" ? new Date() : null,
      };
    });
    const optimistic = { ...project, phases: newPhases };
    setProject(optimistic);
    try {
      await apiJsonBody(`/api/projects/${id}`, "PATCH", { phases: newPhases });
    } catch {
      alert("Nem sikerült menteni a fázis állapotát.");
      void reload();
    }
  };

  const toggleChecklistItem = async (itemId: string, currentCompleted: boolean) => {
    if (!project) return;
    const newChecklist = project.checklist.map((item) => {
      if (item._id === itemId) {
        return {
          ...item,
          completed: !currentCompleted,
          completed_at: !currentCompleted ? new Date() : null,
        };
      }
      return item;
    });

    try {
      await apiJsonBody(`/api/projects/${id}`, "PATCH", {
        checklist: newChecklist,
      });
      setProject({ ...project, checklist: newChecklist });
    } catch {
      alert("Nem sikerült módosítani az elemet.");
    }
  };

  const addChecklistItem = async () => {
    if (!project) return;
    const label = window.prompt("Új elem neve:");
    if (!label?.trim()) return;

    const newItem = {
      _id: crypto.randomUUID(),
      label: label.trim(),
      category: "other" as const,
      required: false,
      completed: false,
      completed_at: null,
      uploaded_file_url: null,
      note: null,
    };

    const newChecklist = [...project.checklist, newItem];

    try {
      await apiJsonBody(`/api/projects/${id}`, "PATCH", {
        checklist: newChecklist,
      });
      setProject({ ...project, checklist: newChecklist });
    } catch {
      alert("Nem sikerült hozzáadni az elemet.");
    }
  };

  const loadPriceList = async () => {
    if (priceList.length > 0) return;
    setLoadingPriceList(true);
    try {
      const res = await apiJson<any[]>("/api/price-list");
      setPriceList(res.filter((p: any) => p.is_active && p.type === "product"));
    } catch (e) {
      console.error("Nem sikerült betölteni az árlistát:", e);
    } finally {
      setLoadingPriceList(false);
    }
  };

  useEffect(() => {
    if (activeTab === "shopping_list") {
      void loadPriceList();
    }
  }, [activeTab]);

  const handleAddItem = async (pli: any) => {
    if (!project) return;
    const qtyStr = window.prompt(`Mennyi szükséges a termékből (${pli.unit})?`, "1");
    if (qtyStr === null) return;
    const qty = Number(qtyStr);
    if (isNaN(qty) || qty <= 0) {
      alert("Érvénytelen mennyiség.");
      return;
    }

    const currentItems = project.required_items ?? [];
    if (currentItems.some((it) => it.price_list_item_id === pli._id)) {
      alert("Ez a tétel már szerepel a listán.");
      return;
    }

    const updated = [
      ...currentItems,
      {
        price_list_item_id: pli._id,
        name: pli.name,
        unit: pli.unit,
        required_quantity: qty,
        reserved_quantity: 0,
      },
    ];

    try {
      await apiJsonBody(`/api/projects/${id}`, "PATCH", {
        required_items: updated,
      });
      void reload();
    } catch {
      alert("Nem sikerült menteni a bevásárlólistát.");
    }
  };

  const handleEditItemQty = async (pliId: string, currentQty: number, unit: string) => {
    if (!project) return;
    const qtyStr = window.prompt(`Új szükséges mennyiség (${unit}):`, String(currentQty));
    if (qtyStr === null) return;
    const qty = Number(qtyStr);
    if (isNaN(qty) || qty < 0) {
      alert("Érvénytelen mennyiség.");
      return;
    }

    const updated = (project.required_items ?? []).map((it) => {
      if (it.price_list_item_id === pliId) {
        return { ...it, required_quantity: qty };
      }
      return it;
    });

    try {
      await apiJsonBody(`/api/projects/${id}`, "PATCH", {
        required_items: updated,
      });
      void reload();
    } catch {
      alert("Nem sikerült módosítani a mennyiséget.");
    }
  };

  const handleRemoveItem = async (pliId: string) => {
    if (!project) return;
    if (!window.confirm("Biztosan törölni szeretné ezt a tételt a bevásárlólistáról?"))
      return;

    const updated = (project.required_items ?? []).filter(
      (it) => it.price_list_item_id !== pliId,
    );

    try {
      await apiJsonBody(`/api/projects/${id}`, "PATCH", {
        required_items: updated,
      });
      void reload();
    } catch {
      alert("Nem sikerült törölni a tételt.");
    }
  };

  const handleOpenReserveModal = async (item: any) => {
    setLoadingStockInfo(true);
    setShowReserveModal(item);
    setReserveQty(0);
    setStockItemDoc(null);
    try {
      const res = await apiJson<any[]>("/api/warehouse/stock");
      const found = res.find((s) => s.price_list_item_id === item.price_list_item_id);
      if (found) {
        setStockItemDoc(found);
      } else {
        setStockItemDoc(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStockInfo(false);
    }
  };

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReserveModal) return;
    if (reserveQty <= 0) {
      alert("Kérjük, adjon meg érvényes mennyiséget!");
      return;
    }
    setReservingStock(true);
    try {
      const itemId = stockItemDoc
        ? stockItemDoc._id
        : showReserveModal.price_list_item_id;
      const res = await fetch(`/api/warehouse/stock/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: id,
          allocate_quantity: reserveQty,
        }),
      });
      if (!res.ok) throw new Error();
      alert("Sikeres készletfoglalás!");
      setShowReserveModal(null);
      void reload();
    } catch {
      alert("Hiba történt a foglalás során. Ellenőrizze a raktárkészletet.");
    } finally {
      setReservingStock(false);
    }
  };

  const closeProject = async () => {
    if (
      !window.confirm(
        "Biztosan le akarja zárni a projektet? Ez elküldi az összes dokumentumot a partnernek e-mailben.",
      )
    ) {
      return;
    }
    setClosing(true);
    try {
      const res = await fetch(`/api/projects/${id}/close`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Hiba történt a lezárás során");
      }
      alert(
        "A projekt sikeresen lezárva! A záró dokumentumok listáját elküldtük a partnernek.",
      );
      void reload();
    } catch (err) {
      alert("Hiba a lezárás során. Kérjük, próbálja újra.");
    } finally {
      setClosing(false);
    }
  };

  if (loadError || !project) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <p className="text-sm text-[var(--color-status-error)]">
          {loadError ?? "Betöltés…"}
        </p>
        <Button variant="secondary" onClick={() => router.push("/projects")}>
          Vissza
        </Button>
      </div>
    );
  }

  const budgetHours = project.budget_hours ?? 0;
  const progressPct =
    budgetHours > 0
      ? Math.min(100, Math.round((totalLoggedHours / budgetHours) * 100))
      : 0;

  const totalPhases = project.phases.length;
  const completedPhases = project.phases.filter((p) => p.status === "completed").length;
  const phasesProgressPct =
    totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  const tabs = [
    { id: "overview", label: "Áttekintés", icon: <FolderKanban size={15} /> },
    { id: "shopping_list", label: "Bevásárlólista", icon: <ClipboardList size={15} /> },
    { id: "checklist", label: "Anyaggyűjtés", icon: <CheckCircle2 size={15} /> },
    { id: "staging", label: "Staging linkek", icon: <LinkIcon size={15} /> },
    { id: "contracts", label: "Szerződések", icon: <FileSignature size={15} /> },
    { id: "tickets", label: "Ticketek", icon: <Ticket size={15} /> },
    { id: "worklogs", label: "Munkalapok", icon: <ClipboardList size={15} /> },
    {
      id: "certificates",
      label: "Teljesítési igazolások",
      icon: <BadgeCheck size={15} />,
    },
  ];

  const phaseIcon = {
    completed: <CheckCircle2 size={18} style={{ color: "#22c55e" }} />,
    in_progress: (
      <Circle
        size={18}
        style={{
          color: "var(--color-accent-primary)",
          fill: "var(--color-accent-primary)",
        }}
      />
    ),
    pending: <Circle size={18} style={{ color: "var(--color-border-default)" }} />,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center gap-1.5 text-sm w-fit"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-muted)",
            padding: 0,
          }}
        >
          <ArrowLeft size={14} />
          Vissza a projektekhez
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">
            <span className="font-mono">{project.project_number}</span>
          </Badge>
          <Badge variant="info">
            {project.status === "open"
              ? "Aktív"
              : project.status === "on_hold"
                ? "Szünetel"
                : "Lezárva"}
          </Badge>
          {project.category && <Badge variant="default">{project.category}</Badge>}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex flex-col gap-2 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{project.name}</h1>
            <div
              className="flex flex-wrap items-center gap-3 text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              <span className="flex items-center gap-1.5">
                <User size={13} />
                <button
                  className="hover:underline"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-accent-primary)",
                    padding: 0,
                  }}
                  onClick={() => router.push(`/organizations/${project.contact_id}`)}
                >
                  {contactName}
                </button>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <User size={13} />
                {project.assigned_to}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} />
                Határidő:{" "}
                {project.deadline
                  ? new Date(project.deadline).toLocaleDateString("hu-HU")
                  : "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {project.status !== "closed" && (
              <Button
                variant="secondary"
                className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                onClick={closeProject}
                disabled={closing}
              >
                <CheckCircle2 size={15} style={{ marginRight: "6px" }} />{" "}
                {closing ? "Lezárás..." : "Projekt lezárása"}
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => router.push(`/projects/${project._id}/edit`)}
            >
              <Edit size={15} style={{ marginRight: "6px" }} /> Szerkesztés
            </Button>
          </div>
        </div>
      </div>

      {/* Contract warning banner */}
      {activeTab === "overview" && !contractWarningDismissed && (
        <div
          className="flex items-center justify-between gap-4 p-4 rounded-xl border"
          style={{
            background: "rgba(245,158,11,0.08)",
            borderColor: "rgba(245,158,11,0.3)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
            <span className="text-sm font-medium truncate" style={{ color: "#f59e0b" }}>
              Ehhez a projekthez nincs csatolva szerződés.
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              style={{ fontSize: "0.8rem", height: "32px", padding: "0 12px" }}
              onClick={() => router.push(`/contracts/new?project_id=${project._id}`)}
            >
              <FileSignature size={14} style={{ marginRight: "6px" }} />
              Szerződés csatolása
            </Button>
            <button
              onClick={() => void dismissContractWarning()}
              className="p-1.5 rounded-md"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#f59e0b",
              }}
              title="Elvet"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-1 border-b overflow-x-auto pb-px"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            style={{
              borderBottomColor:
                activeTab === tab.id ? "var(--color-accent-primary)" : "transparent",
              color:
                activeTab === tab.id
                  ? "var(--color-accent-primary)"
                  : "var(--color-text-muted)",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${activeTab === tab.id ? "var(--color-accent-primary)" : "transparent"}`,
              cursor: "pointer",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex flex-col gap-6">
        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: 2/3 */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Description + Progress */}
              <div
                className="rounded-xl border p-6 flex flex-col gap-6"
                style={{
                  background: "var(--color-bg-card)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <div className="flex flex-col gap-2">
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Leírás
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {project.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-white">
                        Haladás (Időkeret)
                      </span>
                      <span className="text-sm font-bold text-white flex items-center gap-1">
                        <Clock size={13} style={{ color: "var(--color-text-muted)" }} />
                        {totalLoggedHours}h / {project.budget_hours ?? 0}h
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--color-bg-secondary)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${progressPct}%`,
                          background: "var(--color-accent-primary)",
                        }}
                      />
                    </div>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {progressPct}% teljesítve
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-medium text-white">
                        Haladás (Fázisok)
                      </span>
                      <span className="text-sm font-bold text-white">
                        {completedPhases} / {totalPhases} kész
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--color-bg-secondary)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${phasesProgressPct}%`,
                          background: "#22c55e",
                        }}
                      />
                    </div>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {phasesProgressPct}% teljesítve
                    </p>
                  </div>
                </div>
              </div>

              {/* Phases timeline */}
              <div
                className="rounded-xl border p-6 flex flex-col gap-4"
                style={{
                  background: "var(--color-bg-card)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <h3
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Fázisok & Időterv
                </h3>
                <div className="flex flex-col gap-0">
                  {project.phases.map((phase, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      {/* Icon + connector */}
                      <div className="flex flex-col items-center flex-shrink-0 w-6">
                        <button
                          onClick={() => void togglePhase(idx)}
                          title="Kattints az állapot váltásához"
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            flexShrink: 0,
                            borderRadius: "50%",
                          }}
                        >
                          {phaseIcon[phase.status as keyof typeof phaseIcon]}
                        </button>
                        {idx < project.phases.length - 1 && (
                          <div
                            className="w-0.5 flex-1 min-h-[24px]"
                            style={{ background: "var(--color-border-subtle)" }}
                          />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex flex-col gap-1 pb-6 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-sm font-medium"
                            style={{
                              color:
                                phase.status === "pending"
                                  ? "var(--color-text-muted)"
                                  : "var(--color-text-primary)",
                            }}
                          >
                            {phase.name}
                          </span>
                          {phase.status === "in_progress" && (
                            <Badge variant="info">Aktuális</Badge>
                          )}
                          {phase.status === "completed" && (
                            <Badge variant="success">Kész</Badge>
                          )}
                        </div>
                        <span
                          className="text-xs"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          Határidő:{" "}
                          {phase.due_date
                            ? new Date(phase.due_date).toLocaleDateString("hu-HU")
                            : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: 1/3 */}
            <div className="flex flex-col gap-4">
              {/* Quick stats */}
              <div
                className="rounded-xl border p-6 flex flex-col gap-4"
                style={{
                  background: "var(--color-bg-card)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <h3
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Gyors statisztikák
                </h3>
                <div className="flex flex-col gap-3">
                  {[
                    {
                      icon: <Ticket size={16} />,
                      label: "Nyitott ticketek",
                      value: String(ticketCount),
                      link: `/tickets?project_id=${project._id}`,
                    },
                    {
                      icon: <ClipboardList size={16} />,
                      label: "Munkalapok",
                      value: String(worklogCount),
                      link: `/worklogs?project_id=${project._id}`,
                    },
                    {
                      icon: <BadgeCheck size={16} />,
                      label: "Igazolások",
                      value: String(certCount),
                      link: `/completion-certificates?project_id=${project._id}`,
                    },
                    {
                      icon: <FileSignature size={16} />,
                      label: "Szerződések",
                      value: String(contractCount),
                      link: `/contracts?project_id=${project._id}`,
                    },
                  ].map((stat) => (
                    <button
                      key={stat.label}
                      onClick={() => router.push(stat.link)}
                      className="flex items-center gap-3 p-3 rounded-lg text-left transition-colors w-full"
                      style={{
                        background: "var(--color-bg-secondary)",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--color-bg-card-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "var(--color-bg-secondary)")
                      }
                    >
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "var(--color-accent-badgeBg)",
                          color: "var(--color-accent-primary)",
                        }}
                      >
                        {stat.icon}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="text-lg font-bold text-white">{stat.value}</span>
                        <span
                          className="text-xs truncate"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {stat.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Project meta */}
              <div
                className="rounded-xl border p-6 flex flex-col gap-3"
                style={{
                  background: "var(--color-bg-card)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                <h3
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Adatok
                </h3>
                {[
                  { label: "Felelős", value: project.assigned_to ?? "—" },
                  {
                    label: "Határidő",
                    value: project.deadline
                      ? new Date(project.deadline).toLocaleDateString("hu-HU")
                      : "—",
                  },
                  { label: "Büdzsé (óra)", value: `${project.budget_hours ?? 0}h` },
                  { label: "Elkönyvelt", value: `${totalLoggedHours}h` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span
                      className="text-xs uppercase tracking-wider"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {label}
                    </span>
                    <span className="text-sm font-medium text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Shopping List */}
        {activeTab === "shopping_list" && (
          <div className="flex flex-col gap-6">
            <Card className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Projekt bevásárlólista / Anyagigény
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    A projekthez szükséges eszközök, anyagok, és a raktárból lefoglalt
                    mennyiségek kezelése.
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setShowItemPicker(true)}
                  disabled={project.status === "closed"}
                >
                  <Plus size={15} className="mr-1.5" /> Új tétel hozzáadása
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)] text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Tétel neve</th>
                      <th className="py-3 px-4 text-center">Egység</th>
                      <th className="py-3 px-4 text-right">Szükséges mennyiség</th>
                      <th className="py-3 px-4 text-right">Lefoglalt mennyiség</th>
                      <th className="py-3 px-4 text-center">Státusz</th>
                      <th className="py-3 px-4 text-right">Műveletek</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(project.required_items ?? []).map((item) => {
                      const isFullyReserved =
                        item.reserved_quantity >= item.required_quantity;
                      const hasReservation = item.reserved_quantity > 0;
                      return (
                        <tr
                          key={item.price_list_item_id}
                          className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-secondary)] transition-colors text-sm text-white"
                        >
                          <td className="py-3.5 px-4 font-medium">{item.name}</td>
                          <td className="py-3.5 px-4 text-center text-[var(--color-text-secondary)]">
                            {item.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {item.required_quantity}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-amber-500 font-semibold">
                            {item.reserved_quantity}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isFullyReserved ? (
                              <Badge variant="success">Lefoglalva</Badge>
                            ) : hasReservation ? (
                              <Badge variant="warning">Részben lefoglalva</Badge>
                            ) : (
                              <Badge variant="default">Nincs foglalás</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              {project.status !== "closed" && (
                                <>
                                  <Button
                                    variant="secondary"
                                    className="h-8 px-2.5 text-xs text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                                    onClick={() => handleOpenReserveModal(item)}
                                  >
                                    Foglalás
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="h-8 px-2.5 text-xs"
                                    onClick={() =>
                                      handleEditItemQty(
                                        item.price_list_item_id,
                                        item.required_quantity,
                                        item.unit,
                                      )
                                    }
                                  >
                                    Módosít
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 shrink-0 p-0 text-[var(--color-status-error)]"
                                    onClick={() =>
                                      handleRemoveItem(item.price_list_item_id)
                                    }
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {(project.required_items ?? []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 italic">
                          A bevásárlólista jelenleg üres. Adjon hozzá tételeket a fenti
                          gombbal.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Anyaggyűjtés */}
        {activeTab === "checklist" && (
          <div
            className="rounded-xl border p-6 flex flex-col gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <h3
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Anyaggyűjtés
                </h3>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {project.checklist.filter((i) => i.completed).length} /{" "}
                  {project.checklist.length} elem kész
                </p>
              </div>
              <Button variant="secondary" onClick={() => void addChecklistItem()}>
                <Plus size={15} style={{ marginRight: "6px" }} /> Új elem
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {project.checklist.map((item) => {
                const uploadedLabel = item.uploaded_file_url
                  ? (item.uploaded_file_url.split("/").pop() ?? item.uploaded_file_url)
                  : null;
                return (
                  <div
                    key={item._id}
                    className="flex items-center justify-between gap-4 p-4 rounded-lg border transition-colors"
                    style={{
                      background: "var(--color-bg-secondary)",
                      borderColor: "var(--color-border-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => void toggleChecklistItem(item._id, item.completed)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        {item.completed ? (
                          <CheckCircle2 size={20} style={{ color: "#22c55e" }} />
                        ) : (
                          <Circle
                            size={20}
                            style={{ color: "var(--color-border-default)" }}
                          />
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">
                            {item.label}
                          </span>
                          {item.required && (
                            <span
                              className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{
                                color: "#e53935",
                                background: "rgba(229,57,53,0.1)",
                              }}
                            >
                              Kötelező
                            </span>
                          )}
                        </div>
                        <div
                          className="text-xs capitalize mt-0.5"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {item.category}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {uploadedLabel ? (
                        <Badge variant="success">
                          <UploadCloud
                            size={11}
                            style={{ marginRight: "4px", display: "inline" }}
                          />
                          {uploadedLabel}
                        </Badge>
                      ) : (
                        <span
                          className="text-xs italic"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          Nincs feltöltve
                        </span>
                      )}
                      <button
                        style={{
                          background: "var(--color-bg-card)",
                          border: "none",
                          cursor: "pointer",
                          borderRadius: "6px",
                          padding: "6px",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        <MessageSquare size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Staging links */}
        {activeTab === "staging" && (
          <div
            className="rounded-xl border p-6 flex flex-col gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <h3
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Megtekintési Linkek (Staging)
                </h3>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Küldj linkeket a partnernek jóváhagyásra.
                </p>
              </div>
              <Button variant="primary">
                <Plus size={15} style={{ marginRight: "6px" }} /> Új link
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {project.staging_links.map((link) => {
                const approved = link.approval_status === "approved";
                const dateStr = link.approved_at
                  ? new Date(link.approved_at).toLocaleDateString("hu-HU")
                  : new Date(link.added_at).toLocaleDateString("hu-HU");
                return (
                  <div
                    key={link._id}
                    className="p-4 rounded-lg border flex flex-col gap-3"
                    style={{
                      background: "var(--color-bg-secondary)",
                      borderColor: "var(--color-border-subtle)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="text-sm font-bold text-white">{link.label}</div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs flex items-center gap-1 truncate"
                          style={{ color: "var(--color-accent-primary)" }}
                        >
                          {link.url} <ExternalLink size={10} />
                        </a>
                      </div>
                      <Badge variant={approved ? "success" : "warning"}>
                        {approved ? "Jóváhagyva" : "Jóváhagyásra vár"}
                      </Badge>
                    </div>
                    {approved && (
                      <div
                        className="text-xs pt-2 border-t"
                        style={{
                          color: "var(--color-text-muted)",
                          borderColor: "var(--color-border-subtle)",
                        }}
                      >
                        Jóváhagyta:{" "}
                        <strong className="text-white">{link.approved_by ?? "—"}</strong>{" "}
                        ({dateStr})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contracts */}
        {activeTab === "contracts" && (
          <div
            className="rounded-xl border p-6 flex flex-col gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Kapcsolódó szerződések
              </h3>
              <Button
                variant="secondary"
                onClick={() => router.push(`/contracts/new?project_id=${project._id}`)}
              >
                <Plus size={15} style={{ marginRight: "6px" }} /> Új szerződés
              </Button>
            </div>
            <div
              className="flex flex-col items-center justify-center py-12"
              style={{ color: "var(--color-text-muted)" }}
            >
              <FileSignature size={40} style={{ marginBottom: "12px", opacity: 0.4 }} />
              <p className="text-sm">Ehhez a projekthez még nincs csatolva szerződés.</p>
            </div>
          </div>
        )}

        {/* Tickets / Worklogs / Certificates */}
        {(activeTab === "tickets" ||
          activeTab === "worklogs" ||
          activeTab === "certificates") && (
          <div
            className="rounded-xl border p-6 flex flex-col items-center justify-center min-h-[240px]"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              color: "var(--color-text-muted)",
            }}
          >
            <FolderKanban size={40} style={{ marginBottom: "12px", opacity: 0.4 }} />
            <h2 className="text-base font-semibold text-white mb-1">
              Kapcsolódó{" "}
              {activeTab === "tickets"
                ? "ticketek"
                : activeTab === "worklogs"
                  ? "munkalapok"
                  : "igazolások"}
            </h2>
            <p className="text-sm text-center max-w-md">
              A projekthez csatolt bejegyzések itt jelennek meg.
            </p>
            <Button
              variant="secondary"
              style={{ marginTop: "16px" }}
              onClick={() => router.push(`/${activeTab}/new?project_id=${project._id}`)}
            >
              <Plus size={15} style={{ marginRight: "6px" }} /> Új hozzáadása
            </Button>
          </div>
        )}
      </div>

      {showItemPicker && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "16px",
          }}
        >
          <Card className="p-6 w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">
                Termék hozzáadása az árlistából
              </h2>
              <Button variant="ghost" onClick={() => setShowItemPicker(false)}>
                Bezár
              </Button>
            </div>

            <input
              placeholder="Keresés név vagy cikkszám alapján..."
              className="w-full h-10 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] px-3 text-sm text-white mb-4"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
            />

            <div className="overflow-y-auto flex-1 flex flex-col gap-2">
              {priceList
                .filter(
                  (p) =>
                    p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                    (p.item_number &&
                      p.item_number.toLowerCase().includes(itemSearch.toLowerCase())),
                )
                .map((p) => {
                  const alreadyAdded = (project.required_items ?? []).some(
                    (ri) => ri.price_list_item_id === p._id,
                  );
                  return (
                    <div
                      key={p._id}
                      className="flex justify-between items-center p-3 border border-[var(--color-border-subtle)] rounded-lg"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="font-semibold text-white truncate">{p.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {p.item_number} •{" "}
                          {new Intl.NumberFormat("hu-HU", {
                            style: "currency",
                            currency: "HUF",
                            maximumFractionDigits: 0,
                          }).format(p.net_price)}{" "}
                          / {p.unit}
                        </div>
                      </div>
                      <Button
                        variant={alreadyAdded ? "ghost" : "secondary"}
                        disabled={alreadyAdded}
                        onClick={() => {
                          setShowItemPicker(false);
                          setItemSearch("");
                          void handleAddItem(p);
                        }}
                      >
                        {alreadyAdded ? "Hozzáadva" : "Kiválaszt"}
                      </Button>
                    </div>
                  );
                })}
              {priceList.length === 0 && (
                <div className="text-gray-500 text-center py-4">
                  Nincs termék az árlistában.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {showReserveModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "16px",
          }}
        >
          <Card className="p-6 w-full max-w-md flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                Készletfoglalás a projekthez
              </h2>
              <button
                onClick={() => setShowReserveModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="text-sm text-[var(--color-text-secondary)] flex flex-col gap-1.5">
              <div>
                Termék: <strong className="text-white">{showReserveModal.name}</strong>
              </div>
              <div>
                Igényelt mennyiség:{" "}
                <strong className="text-white">
                  {showReserveModal.required_quantity} {showReserveModal.unit}
                </strong>
              </div>
              <div>
                Jelenleg lefoglalva a projektnek:{" "}
                <strong className="text-white">
                  {showReserveModal.reserved_quantity} {showReserveModal.unit}
                </strong>
              </div>
              <div className="border-t border-[var(--color-border-subtle)] my-2"></div>
              {loadingStockInfo ? (
                <div className="text-gray-400 italic">Raktárkészlet lekérdezése...</div>
              ) : stockItemDoc ? (
                <>
                  <div>
                    Raktárhely:{" "}
                    <strong className="text-white">
                      {stockItemDoc.warehouse_location || "Nincs megadva"}
                    </strong>
                  </div>
                  <div>
                    Raktáron összesen:{" "}
                    <strong className="text-white">
                      {stockItemDoc.quantity_in_stock} {showReserveModal.unit}
                    </strong>
                  </div>
                  <div>
                    Ebből másnak lefoglalva:{" "}
                    <strong className="text-white">
                      {stockItemDoc.quantity_allocated || 0} {showReserveModal.unit}
                    </strong>
                  </div>
                  <div>
                    Szabadon elérhető:{" "}
                    <strong className="text-white">
                      {Math.max(
                        0,
                        stockItemDoc.quantity_in_stock -
                          (stockItemDoc.quantity_allocated || 0),
                      )}{" "}
                      {showReserveModal.unit}
                    </strong>
                  </div>
                </>
              ) : (
                <div className="text-[var(--color-status-error)] italic font-semibold">
                  Ez a termék jelenleg nincs raktáron!
                </div>
              )}
            </div>

            {!loadingStockInfo &&
            stockItemDoc &&
            Math.max(
              0,
              stockItemDoc.quantity_in_stock - (stockItemDoc.quantity_allocated || 0),
            ) > 0 ? (
              <form onSubmit={handleReserveSubmit} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="reserve-qty"
                    className="block text-xs font-semibold text-gray-300 uppercase mb-1"
                  >
                    Foglalni kívánt mennyiség *
                  </label>
                  <input
                    id="reserve-qty"
                    type="number"
                    min={1}
                    max={Math.max(
                      0,
                      stockItemDoc.quantity_in_stock -
                        (stockItemDoc.quantity_allocated || 0),
                    )}
                    value={String(reserveQty || "")}
                    onChange={(e) => setReserveQty(Number(e.target.value))}
                    className="w-full h-10 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] px-3 text-sm text-white"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowReserveModal(null)}
                  >
                    Mégsem
                  </Button>
                  <Button type="submit" variant="primary" disabled={reservingStock}>
                    {reservingStock ? "Foglalás..." : "Foglalás rögzítése"}
                  </Button>
                </div>
              </form>
            ) : !loadingStockInfo ? (
              <div className="flex justify-end gap-3 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowReserveModal(null)}
                >
                  Bezár
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      )}
    </div>
  );
}
