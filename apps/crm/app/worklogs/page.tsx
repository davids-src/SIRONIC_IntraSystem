"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Worklog } from "@crm/types";
import { Search, Filter, Plus, Download, Edit } from "lucide-react";
import { useRouter } from "next/navigation";

// Mock data
const mockWorklogs: Worklog[] = [
  {
    _id: "w1",
    worklog_number: "WL-000001",
    tenantId: "tenant1",
    contact_id: "org1",
    one_time_contact_name: null,
    one_time_contact_phone: null,
    project_id: null,
    created_by: "staff1",
    ticket_id: "t1",
    status: "finalized",
    work_date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    work_start: "08:00",
    work_end: "12:30",
    technician_name: "Kovács János",
    technician_signature: null,
    client_name: "Nagy Péter",
    client_signature: null,
    site_address: "Központi iroda, Budapest",
    work_category: "IT támogatás",
    work_description:
      "Szerver hiba elhárítása, hálózati switch újraindítása és konfigurálása.",
    items: [],
    travel_km: 15,
    notes: "A switch egyik portja kontakthibás volt.",
    pdf_url: "#",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 20 * 60 * 60 * 1000),
  },
  {
    _id: "w2",
    worklog_number: "WL-000002",
    tenantId: "tenant1",
    contact_id: "org1",
    one_time_contact_name: null,
    one_time_contact_phone: null,
    project_id: null,
    created_by: "staff1",
    ticket_id: null,
    status: "draft",
    work_date: new Date(),
    work_start: "14:00",
    work_end: "16:00",
    technician_name: "Kovács János",
    technician_signature: null,
    client_name: "",
    client_signature: null,
    site_address: "2. telephely, Győr",
    work_category: "Karbantartás",
    work_description: "Kamera rendszer tisztítása és fókusz beállítása.",
    items: [],
    travel_km: 120,
    notes: "",
    pdf_url: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const statusColorMap: Record<
  string,
  "success" | "warning" | "error" | "info" | "default"
> = {
  draft: "default",
  finalized: "success",
};

const statusLabels: Record<string, string> = {
  draft: "Piszkozat",
  finalized: "Véglegesített",
};

export default function WorklogsPage() {
  const router = useRouter();

  const columns = [
    {
      key: "id",
      header: "Munkalap",
      accessor: (row: Worklog) => (
        <span className="font-mono text-xs">{row.worklog_number}</span>
      ),
    },
    {
      key: "org",
      header: "Szervezet",
      accessor: (row: Worklog) => row.contact_id ?? "-",
    },
    {
      key: "date",
      header: "Dátum",
      accessor: (row: Worklog) => (
        <div>
          <div>{new Date(row.work_date).toLocaleDateString()}</div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {row.work_start} - {row.work_end}
          </div>
        </div>
      ),
    },
    {
      key: "technician",
      header: "Technikus",
      accessor: (row: Worklog) => row.technician_name,
    },
    {
      key: "category",
      header: "Munkakategória",
      accessor: (row: Worklog) => <Badge variant="default">{row.work_category}</Badge>,
    },
    {
      key: "status",
      header: "Állapot",
      accessor: (row: Worklog) => (
        <Badge variant={statusColorMap[row.status]}>
          {statusLabels[row.status] || row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      accessor: (row: Worklog) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            className="p-2 h-8 w-8"
            onClick={() => router.push(`/worklogs/${row._id}`)}
          >
            <Edit size={14} />
          </Button>
          {row.status === "finalized" && (
            <Button variant="secondary" className="p-2 h-8 w-8">
              <Download size={14} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Munkalapok"
        subtitle="Helyszíni és távoli munkavégzések adminisztrációja"
        actions={
          <Button variant="primary" onClick={() => router.push("/worklogs/new")}>
            <Plus size={16} className="mr-2" />
            Új munkalap
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
              placeholder="Munkalap ID, technikus vagy szervezet..."
              className="pl-9"
            />
          </div>
          <Button variant="secondary" className="w-full sm:w-auto">
            <Filter size={16} className="mr-2" />
            Szűrők
          </Button>
        </div>

        {/* Worklogs table */}
        <Table
          data={mockWorklogs as any[]}
          columns={columns as any[]}
          keyField="_id"
          emptyMessage="Nincs megjeleníthető adat"
        />
      </Card>
    </div>
  );
}
