"use client";

import { Card, Button, Badge } from "@crm/ui";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Ticket,
  FileText,
  FileSignature,
  ClipboardList,
  BadgeCheck,
  Clock,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

const recentActivity = [
  {
    id: "1",
    icon: <ClipboardList size={15} />,
    text: "WL-000042 elkészült — aláírásra vár",
    time: "2 órája",
    link: "/worklogs/w1",
  },
  {
    id: "2",
    icon: <FileSignature size={15} />,
    text: "Karbantartási szerződés érkezett",
    time: "tegnap",
    link: "/contracts/c1",
  },
  {
    id: "3",
    icon: <BadgeCheck size={15} />,
    text: "TI-000018 teljesítési igazolás jóváhagyásra vár",
    time: "tegnap",
    link: "/completion-certificates/cc1",
  },
  {
    id: "4",
    icon: <Ticket size={15} />,
    text: "TICK-0094 megoldva",
    time: "2 napja",
    link: "/tickets/t2",
  },
];

const pendingItems = [
  {
    id: "w1",
    type: "Munkalap",
    number: "WL-000042",
    label: "IT karbantartás",
    urgent: false,
    link: "/worklogs/w1",
  },
  {
    id: "c1",
    type: "Szerződés",
    number: "SZ-000001",
    label: "Éves karbantartási szerz.",
    urgent: true,
    link: "/contracts/c1",
  },
];

export default function PortalDashboardPage() {
  const router = useRouter();

  const stats = [
    {
      label: "Aktív projektek",
      value: "2",
      icon: <FolderKanban size={20} />,
      color: "#8b5cf6",
      bg: "rgba(139,92,246,0.08)",
      link: "/projects",
    },
    {
      label: "Nyitott ticketek",
      value: "2",
      icon: <Ticket size={20} />,
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.08)",
      link: "/tickets",
    },
    {
      label: "Fizetésre váró számlák",
      value: "1",
      icon: <FileText size={20} />,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
      link: "/invoices",
    },
    {
      label: "Aláírásra vár",
      value: "1",
      icon: <FileSignature size={20} />,
      color: "#e53935",
      bg: "rgba(229,57,53,0.08)",
      link: "/contracts",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 min-w-0">
        <h1 className="text-2xl font-bold text-white truncate">Vezérlőpult</h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Üdvözöljük! Tekintse meg a legfrissebb tevékenységeket.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => router.push(stat.link)}
            className="rounded-xl border p-5 flex items-center gap-4 text-left w-full transition-colors"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-border-default)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--color-border-subtle)")
            }
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
            </div>
          </button>
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
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex-1">
                Legutóbbi aktivitás
              </h2>
            </div>
            <div
              className="flex flex-col divide-y"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-3 cursor-pointer"
                  onClick={() => router.push(item.link)}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: "var(--color-bg-secondary)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.text}</p>
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

        {/* Pending actions */}
        <div className="flex flex-col gap-6">
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
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider flex-1">
                Teendők
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                  style={{ background: "var(--color-bg-secondary)" }}
                  onClick={() => router.push(item.link)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--color-bg-card-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--color-bg-secondary)")
                  }
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-semibold uppercase"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {item.type}
                      </span>
                      {item.urgent && <Badge variant="warning">Sürgős</Badge>}
                    </div>
                    <span className="text-sm font-medium text-white truncate">
                      {item.label}
                    </span>
                    <span
                      className="text-xs font-mono"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {item.number}
                    </span>
                  </div>
                  <ArrowRight
                    size={16}
                    style={{ color: "var(--color-text-muted)", flexShrink: 0 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div
            className="rounded-xl border p-6 flex flex-col gap-3"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Gyors elérés
            </h2>
            {[
              {
                label: "Projektjeim",
                href: "/projects",
                icon: <FolderKanban size={15} />,
              },
              {
                label: "Munkalapok",
                href: "/worklogs",
                icon: <ClipboardList size={15} />,
              },
              {
                label: "Szerződések",
                href: "/contracts",
                icon: <FileSignature size={15} />,
              },
            ].map((link) => (
              <button
                key={link.href}
                onClick={() => router.push(link.href)}
                className="flex items-center gap-3 text-sm py-2 text-left w-full"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "var(--color-text-primary)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "var(--color-text-secondary)")
                }
              >
                <span style={{ color: "var(--color-accent-primary)" }}>{link.icon}</span>
                {link.label}
                <ExternalLink size={12} style={{ marginLeft: "auto", opacity: 0.4 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
