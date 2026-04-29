"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { CompletionCertificate } from "@crm/types";
import { Search, Filter, Plus, Download, Edit } from "lucide-react";
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
    status: "accepted",
    work_period_start: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    work_period_end: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    total_hours: 40,
    worklog_ids: ["w1", "w2"],
    ticket_ids: [],
    client_name: "Nagy Péter",
    client_title: "Ügyvezető",
    client_signature: "mock_signature_data",
    signed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    work_summary:
      "A megrendelt hálózatépítési és szerver telepítési munkálatok a szerződésben foglaltak szerint, határidőre és a műszaki előírásoknak megfelelően elkészültek. A hálózat tesztelése sikeresen megtörtént, a szerverek üzemkészek.",
    pdf_url: "#",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    _id: "cc2",
    certificate_number: "CC-000002",
    tenantId: "tenant1",
    contact_id: "org1",
    project_id: null,
    created_by: "staff2",
    title: "Kamera rendszer karbantartás",
    status: "draft",
    work_period_start: new Date(),
    work_period_end: new Date(),
    total_hours: 4,
    worklog_ids: [],
    ticket_ids: [],
    client_name: "",
    client_title: "",
    client_signature: null,
    signed_at: null,
    work_summary: "Havi rendes karbantartás.",
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
  sent: "warning",
  accepted: "success",
  rejected: "error",
};

const statusLabels: Record<string, string> = {
  draft: "Piszkozat",
  sent: "Ügyfélnek kiküldve (Aláírásra vár)",
  accepted: "Elfogadva (Aláírva)",
  rejected: "Elutasítva",
};

export default function CompletionCertificatesPage() {
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
      key: "org",
      header: "Szervezet",
      accessor: (row: CompletionCertificate) => row.contact_id ?? "-",
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
        <Badge variant={statusColorMap[row.status]}>
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
            <Edit size={14} />
          </Button>
          {row.status === "accepted" && (
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
        title="Teljesítési igazolások"
        subtitle="Szerződésekhez és projektekhez kapcsolódó igazolások kezelése"
        actions={
          <Button
            variant="primary"
            onClick={() => router.push("/completion-certificates/new")}
          >
            <Plus size={16} className="mr-2" />
            Új igazolás
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
              placeholder="Igazolás ID, projekt vagy szervezet..."
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
