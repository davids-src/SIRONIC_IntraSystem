"use client";

import { useEffect, useState } from "react";
import { Button, Input, Textarea, Label } from "@crm/ui";
import { Calendar, Save, Trash2, X } from "lucide-react";
import type { WeeklyPlan, WeeklyPlanStatus, WeeklyPlanPriority } from "@crm/types";

const formatDateForInput = (d: Date | string | null | undefined) => {
  if (!d) return "";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "";
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface WeeklyPlanDialogProps {
  plan?: WeeklyPlan | null; // if null/undefined, it's a create
  currentWeek: number;
  currentYear: number;
  currentUserId?: string;
  isAdmin: boolean;
  users: { _id: string; display_name: string; email: string }[];
  tickets: { _id: string; ticket_number: string; title: string }[];
  projects: { _id: string; project_number: string; name: string }[];
  worklogs: { _id: string; worklog_number: string; work_description: string }[];
  onClose: () => void;
  onSave: (data: Partial<WeeklyPlan>) => void;
  onDelete?: (id: string, reason: string) => void;
}

export function WeeklyPlanDialog({
  plan,
  currentWeek,
  currentYear,
  currentUserId,
  isAdmin,
  users,
  tickets,
  projects,
  worklogs,
  onClose,
  onSave,
  onDelete,
}: WeeklyPlanDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [weekNumber, setWeekNumber] = useState(currentWeek);
  const [year, setYear] = useState(currentYear);
  const [status, setStatus] = useState<WeeklyPlanStatus>("todo");
  const [priority, setPriority] = useState<WeeklyPlanPriority>("medium");
  const [ticketId, setTicketId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [worklogId, setWorklogId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");

  useEffect(() => {
    if (plan) {
      setTitle(plan.title || "");
      setDescription(plan.description || "");
      setAssigneeId(plan.assignee_id || "");
      setWeekNumber(plan.week_number);
      setYear(plan.year);
      setStatus(plan.status);
      setPriority(plan.priority);
      setTicketId(plan.ticket_id || "");
      setProjectId(plan.project_id || "");
      setWorklogId(plan.worklog_id || "");
      setDueDate(formatDateForInput(plan.due_date));
    } else {
      setTitle("");
      setDescription("");
      setAssigneeId(currentUserId || "");
      setWeekNumber(currentWeek);
      setYear(currentYear);
      setStatus("todo");
      setPriority("medium");
      setTicketId("");
      setProjectId("");
      setWorklogId("");
      setDueDate("");
    }
  }, [plan, currentWeek, currentYear, currentUserId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || null,
      assignee_id: assigneeId,
      week_number: weekNumber,
      year,
      status,
      priority,
      ticket_id: ticketId || null,
      project_id: projectId || null,
      worklog_id: worklogId || null,
      due_date: dueDate ? new Date(dueDate) : null,
    });
  };

  const handleArchiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !onDelete || !archiveReason.trim()) return;
    onDelete(plan._id, archiveReason.trim());
    setShowArchiveConfirm(false);
  };

  const inputCls =
    "px-3 py-2 text-sm rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] w-full";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      {!showArchiveConfirm ? (
        <div
          className="rounded-xl border p-6 flex flex-col gap-4 w-full max-w-xl max-h-[90vh] overflow-y-auto"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-[var(--color-accent-primary)]" />
              {plan ? "Heti terv szerkesztése" : "Új heti terv"}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-title">Megnevezés / Cím *</Label>
              <Input
                id="plan-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pl. Szerver karbantartás, Heti egyeztetés..."
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-description">Részletek / Leírás</Label>
              <Textarea
                id="plan-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Feladat részletes leírása..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Felelős */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-assignee">Felelős *</Label>
                <select
                  id="plan-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className={inputCls}
                  disabled={!isAdmin}
                >
                  <option value="">Válassz felelőst...</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.display_name || u.email}
                    </option>
                  ))}
                </select>
                {!isAdmin && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Csak adminok delegálhatnak másnak.
                  </span>
                )}
              </div>

              {/* Prioritás */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-priority">Prioritás *</Label>
                <select
                  id="plan-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as WeeklyPlanPriority)}
                  className={inputCls}
                >
                  <option value="low">Alacsony</option>
                  <option value="medium">Közepes</option>
                  <option value="high">Magas</option>
                  <option value="urgent">Sürgős</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Állapot */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-status">Állapot *</Label>
                <select
                  id="plan-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as WeeklyPlanStatus)}
                  className={inputCls}
                >
                  <option value="todo">Teendő</option>
                  <option value="in_progress">Folyamatban</option>
                  <option value="done">Kész</option>
                  <option value="blocked">Elakadt</option>
                </select>
              </div>

              {/* Határidő */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-due-date">Határidő</Label>
                <input
                  id="plan-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Hét száma */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-week">Hét száma *</Label>
                <input
                  id="plan-week"
                  type="number"
                  min={1}
                  max={53}
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(parseInt(e.target.value, 10))}
                  className={inputCls}
                  required
                />
              </div>

              {/* Év */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="plan-year">Év *</Label>
                <input
                  id="plan-year"
                  type="number"
                  min={2020}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <div className="border-t border-[var(--color-border-subtle)] pt-3 flex flex-col gap-3">
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                Kapcsolódó CRM entitások (opcionális)
              </span>

              {/* Ticket kapcsolat */}
              <div className="flex flex-col gap-1">
                <Label htmlFor="plan-ticket">Ticket</Label>
                <select
                  id="plan-ticket"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Nincs ticket kapcsolat...</option>
                  {tickets.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.ticket_number} – {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Projekt kapcsolat */}
              <div className="flex flex-col gap-1">
                <Label htmlFor="plan-project">Projekt</Label>
                <select
                  id="plan-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Nincs projekt kapcsolat...</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.project_number} – {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Worklog kapcsolat */}
              <div className="flex flex-col gap-1">
                <Label htmlFor="plan-worklog">Munkalap</Label>
                <select
                  id="plan-worklog"
                  value={worklogId}
                  onChange={(e) => setWorklogId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Nincs munkalap kapcsolat...</option>
                  {worklogs.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.worklog_number} – {w.work_description.substring(0, 60)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-4 mt-2">
              <div>
                {plan && onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    style={{ color: "var(--color-status-error, #f87171)" }}
                    onClick={() => setShowArchiveConfirm(true)}
                  >
                    <Trash2 size={15} className="mr-1.5" />
                    Archiválás
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Mégse
                </Button>
                <Button type="submit" variant="primary">
                  <Save size={15} className="mr-1.5" />
                  Mentés
                </Button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div
          className="rounded-xl border p-6 w-full max-w-md"
          style={{
            background: "var(--color-bg-card)",
            borderColor: "var(--color-border-subtle)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-md font-bold text-white mb-2">Heti terv archiválása</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Biztosan archiválni szeretnéd ezt a heti tervet?
            <br />
            Kérjük, add meg az archiválás indokát.
          </p>

          <form onSubmit={handleArchiveSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="archive-reason">Archiválás oka *</Label>
              <Input
                id="archive-reason"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="Pl. Elavult, megvalósult másképp..."
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowArchiveConfirm(false)}
              >
                Mégse
              </Button>
              <Button
                type="submit"
                variant="primary"
                style={{
                  backgroundColor: "var(--color-status-error, #f87171)",
                  borderColor: "var(--color-status-error, #f87171)",
                }}
              >
                Archiválás indítása
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
