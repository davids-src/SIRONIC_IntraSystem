"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const mockTickets: Ticket[] = [
  {
    _id: "t1",
    ticket_number: "TK-000001",
    tenantId: "tenant1",
    contact_id: "Tech Solutions Kft.",
    one_time_contact_name: null,
    one_time_contact_phone: null,
    project_id: null,
    created_by: "user1",
    assigned_to: "Kovács János",
    source: "partner_portal",
    category: "Hibabejelentés",
    priority: "high",
    status: "new",
    title: "Szerver leállás a központi irodában",
    description: "A szerver nem elérhető, a belső hálózat megszakadt.",
    location: "Központi iroda",
    affected_items: "SRV-01 szerver",
    attachments: [],
    comments: [],
    resolution_notes: null,
    resolved_at: null,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    _id: "t2",
    ticket_number: "TK-000002",
    tenantId: "tenant1",
    contact_id: "Alpha Épület Zrt.",
    one_time_contact_name: null,
    one_time_contact_phone: null,
    project_id: null,
    created_by: "user2",
    assigned_to: "Nagy Péter",
    source: "crm",
    category: "Karbantartás",
    priority: "medium",
    status: "in_progress",
    title: "Kamera rendszer karbantartása",
    description: "Havi rendes karbantartás a 2. telephelyen.",
    location: "2. telephely",
    affected_items: "CAM-01, CAM-02, CAM-03",
    attachments: [],
    comments: [],
    resolution_notes: null,
    resolved_at: null,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    _id: "t3",
    ticket_number: "TK-000003",
    tenantId: "tenant1",
    contact_id: "Beta Logisztika Kft.",
    one_time_contact_name: null,
    one_time_contact_phone: null,
    project_id: "p1",
    created_by: "user1",
    assigned_to: "Kovács János",
    source: "crm",
    category: "IT támogatás",
    priority: "low",
    status: "waiting",
    title: "VPN hozzáférés konfigurálása",
    description: "Új munkavállaló VPN hozzáférésének beállítása.",
    location: "Remote",
    affected_items: "VPN szerver",
    attachments: [],
    comments: [],
    resolution_notes: null,
    resolved_at: null,
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
  {
    _id: "t4",
    ticket_number: "TK-000004",
    tenantId: "tenant1",
    contact_id: "Tech Solutions Kft.",
    one_time_contact_name: null,
    one_time_contact_phone: null,
    project_id: null,
    created_by: "user1",
    assigned_to: "Nagy Péter",
    source: "partner_portal",
    category: "Hibabejelentés",
    priority: "critical",
    status: "resolved",
    title: "Tűzfal szabályzat hiba",
    description: "Nem megfelelő tűzfal konfiguráció blokkolja az üzleti forgalmat.",
    location: "Adatközpont",
    affected_items: "FW-01",
    attachments: [],
    comments: [],
    resolution_notes: "Szabályzat frissítve.",
    resolved_at: new Date(Date.now() - 3 * 60 * 60 * 1000),
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
];

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

  const filtered = mockTickets.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      (t.contact_id ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    new: mockTickets.filter((t) => t.status === "new").length,
    in_progress: mockTickets.filter((t) => t.status === "in_progress").length,
    waiting: mockTickets.filter((t) => t.status === "waiting").length,
    resolved: mockTickets.filter((t) => t.status === "resolved").length,
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

      {/* Search + filters */}
      <div
        className="rounded-xl border p-4 flex flex-wrap gap-3"
        style={{
          background: "var(--color-bg-card)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <div className="flex-1 min-w-[180px] relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            type="text"
            placeholder="Keresés ticketben..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-md text-sm border text-white placeholder:text-gray-500 outline-none"
            style={{
              borderColor: "var(--color-border-default)",
              background: "var(--color-bg-secondary)",
            }}
          />
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
    </div>
  );
}
