"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { CompletionCertificate } from "@crm/types";
import { Search, Filter, Eye, Download } from "lucide-react";
import { useRouter } from "next/navigation";

// Mock data
const mockCertificates: CompletionCertificate[] = [
  {
    _id: "cc1",
    certificate_number: "CC-000001",
    tenantId: "tenant1",
    contact_id: "org1",
    project_id: null,
    created_by: "staff1",
    title: "Új irodaház hálózatépítés és szerver telepítés",
    status: "sent",
    work_period_start: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    work_period_end: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    total_hours: 40,
    worklog_ids: ["w1", "w2"],
    ticket_ids: [],
    client_name: "Nagy Péter",
    client_title: "Ügyvezető",
    client_signature: null,
    signed_at: null,
    work_summary:
      "A megrendelt hálózatépítési és szerver telepítési munkálatok a szerződésben foglaltak szerint, határidőre és a műszaki előírásoknak megfelelően elkészültek.",
    pdf_url: "#",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
];

const statusColorMap: Record<
  string,
  "success" | "warning" | "error" | "info" | "default"
> = {
  sent: "warning",
  accepted: "success",
};

const statusLabels: Record<string, string> = {
  sent: "Aláírásra vár",
  accepted: "Aláírva (Elfogadva)",
};

export default function PartnerCompletionCertificatesPage() {
  const router = useRouter();

  const columns = [
    {
      key: "id",
      header: "Igazolás",
      accessor: (row: CompletionCertificate) => (
        <span className="font-mono text-xs">{row.certificate_number}</span>
      ),
    },
    {
      key: "project",
      header: "Tárgy",
      accessor: (row: CompletionCertificate) => (
        <span className="font-medium">{row.title}</span>
      ),
    },
    {
      key: "date",
      header: "Teljesítés időszaka",
      accessor: (row: CompletionCertificate) =>
        `${row.work_period_start ? new Date(row.work_period_start).toLocaleDateString() : "-"} - ${
          row.work_period_end ? new Date(row.work_period_end).toLocaleDateString() : "-"
        }`,
    },
    {
      key: "status",
      header: "Állapot",
      accessor: (row: CompletionCertificate) => (
        <Badge variant={statusColorMap[row.status] || "default"}>
          {statusLabels[row.status] || row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      accessor: (row: CompletionCertificate) => (
        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            className="p-2 h-8 w-8"
            onClick={() => router.push(`/completion-certificates/${row._id}`)}
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
        title="Teljesítési igazolások"
        subtitle="Szerződésekhez és projektekhez kapcsolódó igazolások megtekintése és jóváhagyása"
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
              placeholder="Igazolás ID vagy projekt neve..."
              className="pl-9"
            />
          </div>
          <Button variant="secondary" className="w-full sm:w-auto">
            <Filter size={16} className="mr-2" />
            Szűrők
          </Button>
        </div>

        {/* Table */}
        <Table
          data={mockCertificates as any[]}
          columns={columns as any[]}
          keyField="_id"
          emptyMessage="Nincs megjeleníthető adat"
        />
      </Card>
    </div>
  );
}
