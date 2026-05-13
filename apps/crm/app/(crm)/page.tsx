"use client";

import * as React from "react";
import { Button } from "@crm/ui";
import { hasPermission } from "@crm/rbac";
import { toActorContext } from "@crm/auth";
import type { RoleKey } from "@crm/types";
import type { Session } from "next-auth";
import { useSession } from "next-auth/react";
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
} from "lucide-react";
import { apiJson, ApiError } from "@/lib/api-client";

type ActivityKind = "ticket" | "worklog" | "contract" | "certificate";

type DashboardPayload = {
  stats: {
    openTickets: number;
    activeProjects: number;
    invoicesAwaiting: number;
    pendingSignatures: number;
  };
  recentActivity: {
    id: string;
    kind: ActivityKind;
    description: string;
    timeLabel: string;
    at: string;
  }[];
  upcomingDeadlines: {
    id: string;
    kind: "project" | "contract";
    name: string;
    type: string;
    contact: string;
    date: string;
    badge: string;
    urgent: boolean;
  }[];
  pendingSignatures: {
    id: string;
    kind: "contract" | "certificate";
    number: string;
    name: string;
    contact: string;
    href: string;
  }[];
};

function activityIcon(kind: ActivityKind) {
  const wrap = (node: React.ReactNode) => (
    <div
      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ background: "rgba(229,57,53,0.08)", color: "#e53935" }}
    >
      {node}
    </div>
  );
  switch (kind) {
    case "ticket":
      return wrap(<Ticket size={16} />);
    case "worklog":
      return wrap(<ClipboardList size={16} />);
    case "contract":
      return wrap(<FileSignature size={16} />);
    case "certificate":
      return wrap(<BadgeCheck size={16} />);
    default:
      return wrap(<Clock size={16} />);
  }
}

export default function CrmDashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const sessionUser = session?.user as Session["user"] | undefined;
  const [data, setData] = React.useState<DashboardPayload | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const actor =
    sessionUser?.id && sessionUser.tenantId && sessionUser.roleKeys
      ? toActorContext({
          userId: sessionUser.id,
          tenantId: sessionUser.tenantId,
          roleKeys: sessionUser.roleKeys as RoleKey[],
        })
      : null;
  const canViewOrganizations = actor
    ? hasPermission(actor, { module: "contact", action: "view", scope: "global" })
    : false;

  React.useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const json = await apiJson<DashboardPayload>("/api/dashboard", {
          signal: ac.signal,
        });
        setData(json);
        setLoadError(null);
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) {
          setLoadError("Nincs jogosultságod a vezérlőpulthoz.");
        } else if (e instanceof Error && e.name === "AbortError") {
          return;
        } else {
          setLoadError("A vezérlőpult adatai nem tölthetők be.");
        }
      }
    })();
    return () => ac.abort();
  }, []);

  const stats = data?.stats;
  const statCards = stats
    ? [
        {
          label: "Nyitott ticketek",
          value: String(stats.openTickets),
          icon: <Ticket size={20} />,
          color: "#3b82f6",
          bg: "rgba(59,130,246,0.08)",
        },
        {
          label: "Aktív projektek",
          value: String(stats.activeProjects),
          icon: <FolderKanban size={20} />,
          color: "#8b5cf6",
          bg: "rgba(139,92,246,0.08)",
        },
        {
          label: "Fizetésre vár (számla)",
          value: String(stats.invoicesAwaiting),
          icon: <FileText size={20} />,
          color: "#f59e0b",
          bg: "rgba(245,158,11,0.08)",
        },
        {
          label: "Aláírásra vár",
          value: String(stats.pendingSignatures),
          icon: <BadgeCheck size={20} />,
          color: "#e53935",
          bg: "rgba(229,57,53,0.08)",
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
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

      {loadError && (
        <p className="text-sm text-[var(--color-status-error)]" role="alert">
          {loadError}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
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
            </div>
          </div>
        ))}
        {!data && !loadError && (
          <p
            className="text-sm col-span-full"
            style={{ color: "var(--color-text-muted)" }}
          >
            Betöltés…
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              {(data?.recentActivity ?? []).length === 0 && data && (
                <p className="text-sm py-4" style={{ color: "var(--color-text-muted)" }}>
                  Még nincs megjeleníthető aktivitás.
                </p>
              )}
              {(data?.recentActivity ?? []).map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3">
                  {activityIcon(item.kind)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.description}</p>
                  </div>
                  <div
                    className="flex-shrink-0 flex items-center gap-1 text-xs whitespace-nowrap"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Clock size={11} />
                    {item.timeLabel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

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
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Közelgő határidők
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {(data?.upcomingDeadlines ?? []).length === 0 && data && (
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Nincs közelgő határidő a következő 60 napban.
                </p>
              )}
              {(data?.upcomingDeadlines ?? []).map((dl) => (
                <button
                  type="button"
                  key={`${dl.kind}-${dl.id}`}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg text-left w-full border-0 cursor-pointer"
                  style={{ background: "var(--color-bg-secondary)" }}
                  onClick={() =>
                    router.push(
                      dl.kind === "project"
                        ? `/projects/${dl.id}`
                        : `/contracts/${dl.id}`,
                    )
                  }
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
                </button>
              ))}
            </div>
          </div>

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
              {(data?.pendingSignatures ?? []).length === 0 && data && (
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Nincs függőben lévő aláírás.
                </p>
              )}
              {(data?.pendingSignatures ?? []).map((sig) => (
                <div
                  key={`${sig.kind}-${sig.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                  style={{ background: "var(--color-bg-secondary)" }}
                  onClick={() => router.push(sig.href)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--color-bg-card-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "var(--color-bg-secondary)")
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(sig.href);
                    }
                  }}
                  role="button"
                  tabIndex={0}
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
