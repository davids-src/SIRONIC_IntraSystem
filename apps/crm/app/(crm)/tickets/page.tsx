"use client";

import { PageHeader, Card, Table, Badge, Button, Input, Label } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { Ticket } from "@crm/types";
import {
  Search,
  Filter,
  Plus,
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
  AlertTriangle,
  Archive,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function parseTicket(raw: unknown): Ticket {
  const t = raw as Record<string, unknown>;
  return {
    ...(t as unknown as Ticket),
    created_at: new Date(String(t["created_at"])),
    updated_at: new Date(String(t["updated_at"])),
    resolved_at: t["resolved_at"] ? new Date(String(t["resolved_at"])) : null,
  };
}

const priorityVariant = {
  low: "info",
  medium: "warning",
  high: "error",
  critical: "error",
} as const;
const priorityLabel = {
  low: "Alacsony",
  medium: "Közepes",
  high: "Magas",
  critical: "Kritikus",
} as const;
const statusVariant = {
  new: "info",
  in_progress: "warning",
  waiting: "default",
  resolved: "success",
  closed: "default",
} as const;
const statusLabel = {
  new: "Új",
  in_progress: "Folyamatban",
  waiting: "Várakozás",
  resolved: "Megoldva",
  closed: "Lezárva",
} as const;

export default function TicketsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Ticket | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const loadData = async () => {
    try {
      const r = await fetch(`/api/tickets?include_archived=${includeArchived}`);
      if (!r.ok) {
        setLoadError("A ticket lista nem elérhető.");
        return;
      }
      const data = (await r.json()) as unknown[];
      setTickets(data.map((row) => parseTicket(row)));
    } catch {
      setLoadError("A ticket lista nem elérhető.");
    }
  };

  useEffect(() => {
    loadData();
  }, [includeArchived]);

  const handleArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveTarget) return;
    const res = await fetch(`/api/tickets/${archiveTarget._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_archived: true,
        archived_at: new Date(),
        archive_reason: archiveReason.trim(),
      }),
    });
    if (res.ok) {
      setArchiveTarget(null);
      setArchiveReason("");
      loadData();
    } else alert("Sikertelen archiválás.");
  };

  const handleRestore = async (id: string) => {
    if (!confirm("Vissza szeretnéd állítani ezt a ticketet?")) return;
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_archived: false,
        archived_at: null,
        archive_reason: null,
      }),
    });
    if (res.ok) loadData();
    else alert("Sikertelen visszaállítás.");
  };

  const filtered = tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      (t.contact_id ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    new: tickets.filter((t) => t.status === "new").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    waiting: tickets.filter((t) => t.status === "waiting").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  const columns: Column<Ticket>[] = [
    {
      key: "ticket_number",
      header: "Ticket",
      width: "120px",
      render: (row) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "var(--color-text-muted, #555)",
          }}
        >
          {row.ticket_number}
        </span>
      ),
    },
    {
      key: "title",
      header: "Cím",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>{row.title}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
            {row.contact_id ?? "—"} · {row.location ?? ""}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategória",
      render: (row) => <Badge variant="default">{row.category}</Badge>,
    },
    {
      key: "priority",
      header: "Prioritás",
      width: "110px",
      render: (row) => (
        <Badge
          variant={
            priorityVariant[row.priority as keyof typeof priorityVariant] ?? "default"
          }
        >
          {priorityLabel[row.priority as keyof typeof priorityLabel] ?? row.priority}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Állapot",
      width: "130px",
      render: (row) => (
        <Badge
          variant={statusVariant[row.status as keyof typeof statusVariant] ?? "default"}
        >
          {statusLabel[row.status as keyof typeof statusLabel] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "assigned_to",
      header: "Felelős",
      width: "130px",
      render: (row) => (
        <span
          style={{ fontSize: "0.825rem", color: "var(--color-text-secondary, #a0a0a0)" }}
        >
          {row.assigned_to ?? "—"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Létrehozva",
      width: "110px",
      render: (row) => (
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
          {new Date(row.created_at).toLocaleDateString("hu-HU")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "72px",
      render: (row) => (
        <div style={{ display: "flex", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
          {row.is_archived ? (
            <button
              onClick={() => handleRestore(row._id)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                padding: "4px",
                borderRadius: "6px",
              }}
              title="Visszaállítás"
            >
              <RotateCcw size={14} />
            </button>
          ) : (
            <button
              onClick={() => {
                setArchiveTarget(row);
                setArchiveReason("");
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--color-status-error, #f87171)",
                padding: "4px",
                borderRadius: "6px",
              }}
              title="Archiválás"
            >
              <Archive size={14} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">Ticketek</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Ügyfél bejelentések és belső feladatok kezelése
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="primary" onClick={() => router.push("/tickets/new")}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új ticket
          </Button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Új",
            count: counts.new,
            icon: <TicketIcon size={20} />,
            color: "#3b82f6",
            bg: "rgba(59,130,246,0.08)",
          },
          {
            label: "Folyamatban",
            count: counts.in_progress,
            icon: <Clock size={20} />,
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.08)",
          },
          {
            label: "Várakozás",
            count: counts.waiting,
            icon: <AlertTriangle size={20} />,
            color: "#6b7280",
            bg: "rgba(107,114,128,0.1)",
          },
          {
            label: "Megoldva",
            count: counts.resolved,
            icon: <CheckCircle size={20} />,
            color: "#22c55e",
            bg: "rgba(34,197,94,0.08)",
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
              <span className="text-2xl font-bold text-white">{stat.count}</span>
              <span
                className="text-xs truncate"
                style={{ color: "var(--color-text-muted)" }}
              >
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {loadError ? (
        <p className="text-sm" style={{ color: "var(--color-danger, #f87171)" }}>
          {loadError}
        </p>
      ) : null}

      {/* Search + filters */}
      <div
        className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:flex-wrap sm:items-end"
        style={{
          background: "var(--color-bg-card)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <div className="relative min-w-[180px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <Label htmlFor="ticket-search" className="sr-only">
            Keresés ticketek között
          </Label>
          <Input
            id="ticket-search"
            placeholder="Keresés ticketben..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="tk-include-archived"
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
              htmlFor="tk-include-archived"
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Archivált elemek megjelenítése
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <div className="overflow-x-auto">
          <Table<Ticket>
            data={filtered}
            columns={columns}
            keyField="_id"
            onRowClick={(row) => router.push(`/tickets/${row._id}`)}
            emptyMessage="Nincs találat a keresési feltételekre"
          />
        </div>
      </div>

      {archiveTarget && (
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
          onClick={() => setArchiveTarget(null)}
        >
          <div
            className="rounded-xl border p-6"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              width: "100%",
              maxWidth: "450px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 12px 0", color: "#fff" }}>Ticket archiválása</h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-muted)",
                marginBottom: "16px",
              }}
            >
              Biztosan archiválni szeretnéd:{" "}
              <strong>{archiveTarget.ticket_number}</strong>?<br />
              Kérjük, add meg az archiválás indokát.
            </p>
            <form
              onSubmit={handleArchive}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                  Archiválás oka *
                </label>
                <Input
                  id="tk-archive-reason"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Pl. Lezárt, duplikátum..."
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setArchiveTarget(null)}
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
                  Archiválás
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
