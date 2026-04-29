"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Worklog } from "@crm/types";
import { Search, Filter, Eye, Download } from "lucide-react";
import { useRouter } from "next/navigation";

// Mock data
const mockWorklogs: Worklog[] = [
  {
    _id: "w1",
    worklog_number: "WL-000001",
    tenantId: "tenant1",
    organization_id: "org1", // Match partner org
    project_id: null,
    partner_id: "partner1",
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
    work_type: "it_support",
    work_description: "Szerver hiba elhárítása...",
    devices_serviced: [],
    materials_used: [],
    travel_km: 15,
    notes: "",
    pdf_url: "#",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 20 * 60 * 60 * 1000),
  },
];

const statusColorMap: Record<
  string,
  "success" | "warning" | "error" | "info" | "default"
> = {
  finalized: "success",
  signed: "info",
};

const statusLabels: Record<string, string> = {
  finalized: "Jóváhagyásra vár",
  signed: "Aláírva",
};

const workTypeLabels: Record<string, string> = {
  it_support: "IT Támogatás",
  network: "Hálózatépítés",
  security: "Biztonságtechnika",
  web: "Webfejlesztés",
  maintenance: "Karbantartás",
  installation: "Telepítés",
};

export default function PartnerWorklogsPage() {
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
      key: "type",
      header: "Típus",
      accessor: (row: Worklog) => (
        <Badge variant="default">{workTypeLabels[row.work_type] || row.work_type}</Badge>
      ),
    },
    {
      key: "status",
      header: "Állapot",
      accessor: (row: Worklog) => (
        <Badge variant={statusColorMap[row.status] || "default"}>
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
            <Eye size={14} />
          </Button>
          <Button variant="secondary" className="p-2 h-8 w-8">
            <Download size={14} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Munkalapok"
        subtitle="Helyszíni munkavégzések és felhasznált anyagok megtekintése"
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
              placeholder="Munkalap ID, technikus vagy cím..."
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
          emptyMessage="Nincs megjeleníthető munkalap"
        />
      </Card>
    </div>
  );
}
