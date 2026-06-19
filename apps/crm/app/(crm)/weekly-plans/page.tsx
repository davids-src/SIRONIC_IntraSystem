"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button, Card, Label } from "@crm/ui";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  RefreshCw,
} from "lucide-react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import type { WeeklyPlan, WeeklyPlanStatus } from "@crm/types";
import { WeeklyPlanBoard } from "./components/weekly-plan-board";
import { WeeklyPlanDialog } from "./components/weekly-plan-dialog";

// ISO Week helper
function getISOWeekAndYear(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

export default function WeeklyPlansPage() {
  const { data: session } = useSession();
  const sessionUser = session?.user;
  const isAdmin =
    (sessionUser?.roleKeys as string[] | undefined)?.includes("crm.admin") || false;
  const currentUserId = sessionUser?.id || "";

  // Get current week/year as initial state
  const today = new Date();
  const currentIso = getISOWeekAndYear(today);

  const [selectedWeek, setSelectedWeek] = useState(currentIso.week);
  const [selectedYear, setSelectedYear] = useState(currentIso.year);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const [plans, setPlans] = useState<WeeklyPlan[]>([]);
  const [users, setUsers] = useState<
    { _id: string; display_name: string; email: string }[]
  >([]);
  const [tickets, setTickets] = useState<
    { _id: string; ticket_number: string; title: string }[]
  >([]);
  const [projects, setProjects] = useState<
    { _id: string; project_number: string; name: string }[]
  >([]);
  const [worklogs, setWorklogs] = useState<
    { _id: string; worklog_number: string; work_description: string }[]
  >([]);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WeeklyPlan | null>(null);

  // Load relations
  useEffect(() => {
    const loadRelations = async () => {
      try {
        const [u, t, p, w] = await Promise.all([
          apiJson<any[]>("/api/crm-users"),
          apiJson<any[]>("/api/tickets"),
          apiJson<any[]>("/api/projects"),
          apiJson<any[]>("/api/worklogs"),
        ]);
        setUsers(u);
        setTickets(t);
        setProjects(p);
        setWorklogs(w);
      } catch (e) {
        console.error("Hiba a relációk betöltésekor:", e);
      }
    };
    loadRelations();
  }, []);

  // Load plans
  const loadPlans = async () => {
    try {
      setLoadError(null);
      const query = new URLSearchParams({
        week_number: String(selectedWeek),
        year: String(selectedYear),
        include_archived: String(includeArchived),
      });
      if (selectedAssignee) {
        query.append("assignee_id", selectedAssignee);
      }
      const data = await apiJson<WeeklyPlan[]>(`/api/weekly-plans?${query.toString()}`);
      setPlans(data);
    } catch (e) {
      setLoadError(
        e instanceof ApiError ? e.message : "A heti tervek betöltése sikertelen.",
      );
    }
  };

  useEffect(() => {
    loadPlans();
  }, [selectedWeek, selectedYear, selectedAssignee, includeArchived]);

  // Actions
  const handleSavePlan = async (data: Partial<WeeklyPlan>) => {
    setSaving(true);
    try {
      if (editingPlan) {
        await apiJsonBody<WeeklyPlan>(
          `/api/weekly-plans/${editingPlan._id}`,
          "PATCH",
          data,
        );
      } else {
        await apiJsonBody<WeeklyPlan>("/api/weekly-plans", "POST", data);
      }
      setIsDialogOpen(false);
      setEditingPlan(null);
      loadPlans();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Hiba a mentés során.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id: string, reason: string) => {
    setSaving(true);
    try {
      await fetch(`/api/weekly-plans/${id}?reason=${encodeURIComponent(reason)}`, {
        method: "DELETE",
      });
      setIsDialogOpen(false);
      setEditingPlan(null);
      loadPlans();
    } catch (e) {
      alert("Hiba a törlés/archiválás során.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: WeeklyPlanStatus) => {
    try {
      // Find the plan locally first to check permission if not admin
      const plan = plans.find((p) => p._id === id);
      if (!plan) return;

      if (!isAdmin && plan.assignee_id !== currentUserId) {
        alert("Csak a saját feladataid állapotát módosíthatod.");
        return;
      }

      await apiJsonBody<WeeklyPlan>(`/api/weekly-plans/${id}`, "PATCH", {
        status: newStatus,
      });
      loadPlans();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Hiba az állapot frissítése során.");
    }
  };

  // Week navigation
  const navigateWeek = (direction: "prev" | "next" | "current") => {
    if (direction === "current") {
      setSelectedWeek(currentIso.week);
      setSelectedYear(currentIso.year);
    } else {
      let nextW = selectedWeek;
      let nextY = selectedYear;
      if (direction === "prev") {
        if (selectedWeek === 1) {
          nextY = selectedYear - 1;
          nextW = 52; // Simplification of year change week count
        } else {
          nextW = selectedWeek - 1;
        }
      } else {
        if (selectedWeek >= 52) {
          nextY = selectedYear + 1;
          nextW = 1;
        } else {
          nextW = selectedWeek + 1;
        }
      }
      setSelectedWeek(nextW);
      setSelectedYear(nextY);
    }
  };

  const inputCls =
    "px-3 py-2 text-sm rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">Heti tervek</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Belső alkalmazotti feladatok, heti tervek és Kanban tábla
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            variant="primary"
            onClick={() => {
              setEditingPlan(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új terv
          </Button>
        </div>
      </div>

      {loadError && (
        <p className="text-sm" style={{ color: "var(--color-danger, #f87171)" }}>
          {loadError}
        </p>
      )}

      {/* Filter Bar */}
      <div
        className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:flex-wrap sm:items-center justify-between"
        style={{
          background: "var(--color-bg-card)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        {/* Week & Year controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateWeek("prev")}
            className="p-2 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
            <Calendar size={15} className="text-[var(--color-accent-primary)]" />
            <span className="text-sm font-bold text-white">
              {selectedYear}. év, {selectedWeek}. hét
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigateWeek("next")}
            className="p-2 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)] transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          <Button variant="ghost" onClick={() => navigateWeek("current")} size="sm">
            Aktuális hét
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Assignee Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: "var(--color-text-muted)" }} />
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className={inputCls}
            >
              <option value="">Összes munkatárs</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.display_name || u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Archived checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-archived-plans"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              style={{
                width: "16px",
                height: "16px",
                cursor: "pointer",
                accentColor: "var(--color-accent-primary)",
              }}
            />
            <label
              htmlFor="show-archived-plans"
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Archiváltak
            </label>
          </div>

          <button
            type="button"
            onClick={loadPlans}
            className="p-2 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-white transition-colors"
            title="Frissítés"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Board component */}
      <WeeklyPlanBoard
        plans={plans}
        users={users}
        onCardClick={(plan) => {
          setEditingPlan(plan);
          setIsDialogOpen(true);
        }}
        onStatusChange={handleStatusChange}
      />

      {/* Dialog Component */}
      {isDialogOpen && (
        <WeeklyPlanDialog
          plan={editingPlan}
          currentWeek={selectedWeek}
          currentYear={selectedYear}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          users={users}
          tickets={tickets}
          projects={projects}
          worklogs={worklogs}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingPlan(null);
          }}
          onSave={handleSavePlan}
          onDelete={handleDeletePlan}
        />
      )}
    </div>
  );
}
