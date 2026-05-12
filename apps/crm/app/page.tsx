"use client";

import * as React from "react";
import { StatCard, Card, Button } from "@crm/ui";
import { hasPermission } from "@crm/rbac";
import { useRouter } from "next/navigation";
import {
  Ticket,
  FolderKanban,
  FileText,
  BadgeCheck,
  FileSignature,
  ClipboardList,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const recentActivity = [
  {
    id: "1",
    icon: <Ticket size={16} />,
    description: "Új ticket nyitva — Acme Kft. hálózat leállás",
    time: "5 perce",
  },
  {
    id: "2",
    icon: <ClipboardList size={16} />,
    description: "WL-000042 lezárva — Kovács János",
    time: "1 órája",
  },
  {
    id: "3",
    icon: <FileSignature size={16} />,
    description: "Szerződés aláírva — GlobalTech Zrt.",
    time: "3 órája",
  },
  {
    id: "4",
    icon: <BadgeCheck size={16} />,
    description: "Teljesítési igazolás kiküldve — MegaCorp",
    time: "tegnap",
  },
  {
    id: "5",
    icon: <FolderKanban size={16} />,
    description: "Irodaház projekt határideje közelít",
    time: "tegnap",
  },
];

const upcomingDeadlines = [
  {
    name: "Új irodaház hálózatépítés",
    type: "Projekt",
    contact: "Acme Kft.",
    date: "2026.05.25.",
    badge: "12 nap",
    urgent: false,
    id: "p1",
  },
  {
    name: "acme.hu lejárat",
    type: "Domain",
    contact: "Acme Kft.",
    date: "2026.05.11.",
    badge: "Kritikus",
    urgent: true,
    id: null,
  },
  {
    name: "GlobalTech SLA megújítás",
    type: "Szerződés",
    contact: "GlobalTech Zrt.",
    date: "2026.06.01.",
    badge: "19 nap",
    urgent: false,
    id: "c2",
  },
];

const pendingSignatures = [
  {
    id: "c1",
    number: "SZ-000001",
    name: "Éves karbantartási szerz.",
    contact: "Acme Kft.",
  },
  {
    id: "cc3",
    number: "TI-000003",
    name: "Q1 IT üzemeltetés igazolás",
    contact: "GlobalTech Zrt.",
  },
];

export default function CrmDashboardPage() {
  const router = useRouter();
  const canViewOrganizations = hasPermission(
    { actorId: "seed-admin", roleKeys: ["crm.admin"], tenantId: "global" },
    { module: "contact", action: "view", scope: "global" },
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">Vezérlőpult</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Rendszergazda nézet ·{" "}
            {canViewOrganizations ? "Kontaktok elérhetők" : "Korlátozott hozzáférés"}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="primary" onClick={() => router.push("/worklogs/new?quick=1")}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Gyors munkalap
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Nyitott ticketek",
            value: "12",
            trend: "+3",
            icon: <Ticket size={20} />,
            color: "#3b82f6",
            bg: "rgba(59,130,246,0.08)",
          },
          {
            label: "Aktív projektek",
            value: "8",
            trend: "+1",
            icon: <FolderKanban size={20} />,
            color: "#8b5cf6",
            bg: "rgba(139,92,246,0.08)",
          },
          {
            label: "Fizetésre vár",
            value: "3",
            trend: "+1",
            icon: <FileText size={20} />,
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.08)",
          },
          {
            label: "Aláírásra vár",
            value: "5",
            trend: "+2",
            icon: <BadgeCheck size={20} />,
            color: "#e53935",
            bg: "rgba(229,57,53,0.08)",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border p-5 flex items-center gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: stat.bg, color: stat.color }}
            >
              {stat.icon}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span
                className="text-sm truncate"
                style={{ color: "var(--color-text-muted)" }}
              >
                {stat.label}
              </span>
              {stat.trend && (
                <span className="text-xs font-medium" style={{ color: "#22c55e" }}>
                  {stat.trend} ma
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2">
          <div
            className="rounded-xl border p-6 flex flex-col gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <div
              className="flex items-center gap-2 pb-2 border-b"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Legutóbbi aktivitás
              </h2>
            </div>
            <div
              className="flex flex-col divide-y"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(229,57,53,0.08)", color: "#e53935" }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.description}</p>
                  </div>
                  <div
                    className="flex-shrink-0 flex items-center gap-1 text-xs whitespace-nowrap"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Clock size={11} />
                    {item.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Upcoming deadlines */}
          <div
            className="rounded-xl border p-6 flex flex-col gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <div
              className="flex items-center gap-2 pb-2 border-b"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Közelgő határidők
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {upcomingDeadlines.map((dl, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg"
                  style={{ background: "var(--color-bg-secondary)" }}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-white truncate">
                      {dl.name}
                    </span>
                    <span
                      className="text-xs truncate"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {dl.type} · {dl.contact}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {dl.date}
                    </span>
                  </div>
                  <span
                    className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap"
                    style={{
                      background: dl.urgent
                        ? "rgba(229,57,53,0.15)"
                        : "rgba(245,158,11,0.1)",
                      color: dl.urgent ? "#e53935" : "#f59e0b",
                    }}
                  >
                    {dl.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending signatures */}
          <div
            className="rounded-xl border p-6 flex flex-col gap-4"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <div
              className="flex items-center gap-2 pb-2 border-b"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Aláírásra vár
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {pendingSignatures.map((sig) => (
                <div
                  key={sig.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                  style={{ background: "var(--color-bg-secondary)" }}
                  onClick={() => router.push(`/contracts/${sig.id}`)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--color-bg-card-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--color-bg-secondary)")
                  }
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-white truncate">
                      {sig.name}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {sig.contact} · {sig.number}
                    </span>
                  </div>
                  <AlertCircle size={16} style={{ color: "#3b82f6", flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
