"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Ticket } from "@crm/types";
import { Search, Filter, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

// Mock data (Partner Portal side)
const mockTickets: Ticket[] = [
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
    description: "A szerver nem elérhető.",
    location: "Központi iroda",
    affected_items: "SRV-01 szerver",
    attachments: [],
    comments: [],
    resolution_notes: null,
    resolved_at: null,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
];

const priorityColorMap: Record<
  string,
  "success" | "warning" | "error" | "info" | "default"
> = {
  low: "info",
  medium: "warning",
  high: "error",
  critical: "error",
};

const statusColorMap: Record<
  string,
  "success" | "warning" | "error" | "info" | "default"
> = {
  new: "info",
  in_progress: "warning",
  waiting: "default",
  resolved: "success",
  closed: "default",
};

export default function PartnerTicketsPage() {
  const router = useRouter();

  const columns = [
    {
      key: "id",
      header: "ID",
      accessor: (row: Ticket) => (
        <span className="font-mono text-xs">{row.ticket_number}</span>
      ),
    },
    {
      key: "title",
      header: "Cím",
      accessor: (row: Ticket) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "category",
      header: "Kategória",
      accessor: (row: Ticket) => <Badge variant="default">{row.category}</Badge>,
    },
    {
      key: "priority",
      header: "Prioritás",
      accessor: (row: Ticket) => {
        const priorityLabels: Record<string, string> = {
          low: "Alacsony",
          medium: "Közepes",
          high: "Magas",
          critical: "Kritikus",
        };
        return (
          <Badge variant={priorityColorMap[row.priority]}>
            {priorityLabels[row.priority] || row.priority}
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: "Állapot",
      accessor: (row: Ticket) => {
        const statusLabels: Record<string, string> = {
          new: "Új",
          in_progress: "Folyamatban",
          waiting: "Várakozás",
          resolved: "Megoldva",
          closed: "Lezárva",
        };
        return (
          <Badge variant={statusColorMap[row.status]}>
            {statusLabels[row.status] || row.status}
          </Badge>
        );
      },
    },
    {
      key: "created_at",
      header: "Létrehozva",
      accessor: (row: Ticket) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ticketek"
        subtitle="Bejelentett hibák és szervizigények nyomon követése"
        actions={
          <Button variant="primary" onClick={() => router.push("/tickets/new")}>
            <Plus size={16} className="mr-2" />
            Új ticket bejelentése
          </Button>
        }
      />

      <Card className="p-4 space-y-4">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              size={16}
            />
            <Input
              label="Keresés"
              placeholder="Keresés cím vagy azonosító alapján..."
              className="pl-9"
            />
          </div>
          <Button variant="secondary" className="w-full sm:w-auto">
            <Filter size={16} className="mr-2" />
            Szűrők
          </Button>
        </div>

        {/* Tickets table */}
        <Table
          data={mockTickets as any[]}
          columns={columns as any[]}
          keyField="_id"
          emptyMessage="Nincs megjeleníthető adat"
        />
      </Card>
    </div>
  );
}
