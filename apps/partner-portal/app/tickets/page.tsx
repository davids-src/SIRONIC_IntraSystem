"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { Ticket } from "@crm/types";
import {
  Search,
  Plus,
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const myTickets: Ticket[] = [
  {
    _id: "t1",
    ticket_number: "TK-000001",
    tenantId: "tenant1",
    contact_id: "org1",
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
    contact_id: "org1",
    one_time_contact_name: null,
    one_time_contact_phone: null,
    project_id: null,
    created_by: "user1",
    assigned_to: "Nagy Péter",
    source: "crm",
    category: "Karbantartás",
    priority: "medium",
    status: "in_progress",
    title: "Kamera rendszer karbantartása",
    description: "Havi rendes karbantartás a 2. telephelyen.",
    location: "2. telephely",
    affected_items: "CAM-01, CAM-02",
    attachments: [],
    comments: [],
    resolution_notes: null,
    resolved_at: null,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000),
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

export default function PartnerTicketsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = myTickets.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    new: myTickets.filter((t) => t.status === "new").length,
    in_progress: myTickets.filter((t) => t.status === "in_progress").length,
    resolved: myTickets.filter((t) => t.status === "resolved").length,
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
            {row.category} · {row.location ?? ""}
          </div>
        </div>
      ),
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
      header: "Bejelentve",
      width: "110px",
      render: (row) => (
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
          {new Date(row.created_at).toLocaleDateString("hu-HU")}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <PageHeader
        title="Ticketek"
        subtitle="Bejelentett hibák és szervizigények nyomon követése"
        actions={
          <Button variant="primary" onClick={() => router.push("/tickets/new")}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új bejelentés
          </Button>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          {
            label: "Új",
            count: counts.new,
            icon: <TicketIcon size={16} />,
            color: "#3b82f6",
          },
          {
            label: "Folyamatban",
            count: counts.in_progress,
            icon: <Clock size={16} />,
            color: "#f59e0b",
          },
          {
            label: "Megoldva",
            count: counts.resolved,
            icon: <CheckCircle size={16} />,
            color: "#22c55e",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "var(--color-text-muted, #555)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {stat.label}
              </span>
              <span style={{ color: stat.color }}>{stat.icon}</span>
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "var(--color-text-primary, #fff)",
                lineHeight: 1,
              }}
            >
              {stat.count}
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div style={{ position: "relative" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-muted, #555)",
              pointerEvents: "none",
            }}
          />
          <Input
            label=""
            placeholder="Keresés ticketben..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "36px" }}
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table<Ticket>
          data={filtered}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/tickets/${row._id}`)}
          emptyMessage="Nincs megjeleníthető ticket"
        />
      </Card>
    </div>
  );
}
