"use client";

import React from "react";
import { Card, Badge } from "@crm/ui";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  ClipboardList,
  FolderKanban,
  HelpCircle,
  Ticket,
} from "lucide-react";
import type { WeeklyPlan, WeeklyPlanStatus, WeeklyPlanPriority } from "@crm/types";

const formatDate = (d: Date | string | null | undefined) => {
  if (!d) return null;
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return null;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
};

interface WeeklyPlanBoardProps {
  plans: WeeklyPlan[];
  users: { _id: string; display_name: string; email: string }[];
  onCardClick: (plan: WeeklyPlan) => void;
  onStatusChange: (id: string, newStatus: WeeklyPlanStatus) => void;
}

const COLUMNS: { key: WeeklyPlanStatus; label: string; color: string; bg: string }[] = [
  {
    key: "todo",
    label: "Teendő",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.1)",
  },
  {
    key: "in_progress",
    label: "Folyamatban",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
  },
  {
    key: "blocked",
    label: "Elakadt",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
  },
  {
    key: "done",
    label: "Kész",
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
  },
];

const PRIORITY_LABELS: Record<WeeklyPlanPriority, string> = {
  low: "Alacsony",
  medium: "Közepes",
  high: "Magas",
  urgent: "Sürgős",
};

const PRIORITY_BADGES: Record<
  WeeklyPlanPriority,
  "info" | "warning" | "error" | "default"
> = {
  low: "info",
  medium: "warning",
  high: "error",
  urgent: "error",
};

export function WeeklyPlanBoard({
  plans,
  users,
  onCardClick,
  onStatusChange,
}: WeeklyPlanBoardProps) {
  const getAssigneeName = (id: string) => {
    const user = users.find((u) => u._id === id);
    return user ? user.display_name || user.email : "—";
  };

  const getAssigneeInitials = (id: string) => {
    const name = getAssigneeName(id);
    if (name === "—") return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const handleMove = (
    e: React.MouseEvent,
    plan: WeeklyPlan,
    direction: "left" | "right",
  ) => {
    e.stopPropagation();
    const currentIndex = COLUMNS.findIndex((c) => c.key === plan.status);
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    if (direction === "left" && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === "right" && currentIndex < COLUMNS.length - 1) {
      newIndex = currentIndex + 1;
    }

    const targetCol = COLUMNS[newIndex];
    if (targetCol && newIndex !== currentIndex) {
      onStatusChange(plan._id, targetCol.key);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
      {COLUMNS.map((col) => {
        const colPlans = plans.filter((p) => p.status === col.key);

        return (
          <div
            key={col.key}
            className="flex flex-col gap-4 rounded-xl border p-4 min-h-[500px]"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2 mb-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <span className="font-bold text-white text-sm">{col.label}</span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: col.bg, color: col.color }}
              >
                {colPlans.length}
              </span>
            </div>

            {/* Cards List */}
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[650px] pr-1">
              {colPlans.map((plan) => (
                <div
                  key={plan._id}
                  onClick={() => onCardClick(plan)}
                  className="rounded-xl border p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col gap-3 text-left"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border-subtle)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-accent-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border-subtle)";
                  }}
                >
                  {/* Card Header: Priority & Quick Move */}
                  <div className="flex items-center justify-between">
                    <Badge variant={PRIORITY_BADGES[plan.priority]}>
                      {PRIORITY_LABELS[plan.priority]}
                    </Badge>

                    {/* Quick Move Buttons */}
                    <div className="flex items-center gap-1">
                      {plan.status !== "todo" && (
                        <button
                          type="button"
                          onClick={(e) => handleMove(e, plan, "left")}
                          className="p-1 rounded hover:bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] hover:text-white transition-colors"
                          title="Mozgatás balra"
                        >
                          <ArrowLeft size={13} />
                        </button>
                      )}
                      {plan.status !== "done" && (
                        <button
                          type="button"
                          onClick={(e) => handleMove(e, plan, "right")}
                          className="p-1 rounded hover:bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] hover:text-white transition-colors"
                          title="Mozgatás jobbra"
                        >
                          <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="flex flex-col gap-1">
                    <h4 className="font-semibold text-white text-sm leading-tight">
                      {plan.title}
                    </h4>
                    {plan.description && (
                      <p
                        className="text-xs line-clamp-2"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {plan.description}
                      </p>
                    )}
                    {plan.due_date && (
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-[var(--color-text-muted)]">
                        <Calendar
                          size={11}
                          className="text-[var(--color-accent-primary)]"
                        />
                        <span>Határidő: {formatDate(plan.due_date)}</span>
                      </div>
                    )}
                  </div>

                  {/* Relations section */}
                  {(plan.ticket_id || plan.project_id || plan.worklog_id) && (
                    <div
                      className="flex flex-wrap gap-2 pt-2 border-t"
                      style={{ borderColor: "var(--color-border-subtle)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {plan.ticket_id && (
                        <a
                          href={`/tickets/${plan.ticket_id}`}
                          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] text-[var(--color-accent-primary)] hover:underline"
                          title="Kapcsolódó ticket megnyitása"
                        >
                          <Ticket size={10} />
                          Ticket
                        </a>
                      )}
                      {plan.project_id && (
                        <a
                          href={`/projects/${plan.project_id}`}
                          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] text-[var(--color-accent-primary)] hover:underline"
                          title="Kapcsolódó projekt megnyitása"
                        >
                          <FolderKanban size={10} />
                          Projekt
                        </a>
                      )}
                      {plan.worklog_id && (
                        <a
                          href={`/worklogs/${plan.worklog_id}`}
                          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] text-[var(--color-accent-primary)] hover:underline"
                          title="Kapcsolódó munkalap megnyitása"
                        >
                          <ClipboardList size={10} />
                          Munkalap
                        </a>
                      )}
                    </div>
                  )}

                  {/* Card Footer: Assignee */}
                  <div
                    className="flex items-center justify-between pt-2 border-t"
                    style={{ borderColor: "var(--color-border-subtle)" }}
                  >
                    <span
                      className="text-xs truncate max-w-[120px]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {getAssigneeName(plan.assignee_id)}
                    </span>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{
                        backgroundColor: "var(--color-accent-primary)",
                      }}
                      title={getAssigneeName(plan.assignee_id)}
                    >
                      {getAssigneeInitials(plan.assignee_id)}
                    </div>
                  </div>
                </div>
              ))}

              {colPlans.length === 0 && (
                <div
                  className="rounded-xl border border-dashed p-6 text-center text-xs"
                  style={{
                    borderColor: "var(--color-border-subtle)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Nincs feladat ebben az állapotban.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
