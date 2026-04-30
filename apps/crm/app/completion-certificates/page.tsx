"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { CompletionCertificate } from "@crm/types";
import {
  Search,
  Filter,
  Plus,
  Download,
  BadgeCheck,
  Clock,
  FileText,
  CheckCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const mockCertificates: CompletionCertificate[] = [
  {
    _id: "cc1",
    certificate_number: "CC-000001",
    tenantId: "tenant1",
    contact_id: "Tech Solutions Kft.",
    project_id: null,
    created_by: "staff1",
    title: "Irodaház hálózatépítés és szerver telepítés",
    status: "accepted",
    work_period_start: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    work_period_end: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    total_hours: 40,
    worklog_ids: ["w1", "w2"],
    ticket_ids: [],
    client_name: "Nagy Péter",
    client_title: "Ügyvezető",
    client_signature: "sig_data",
    signed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    work_summary: "A munkálatok a szerződésnek megfelelően elkészültek.",
    pdf_url: "#",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    _id: "cc2",
    certificate_number: "CC-000002",
    tenantId: "tenant1",
    contact_id: "Alpha Épület Zrt.",
    project_id: "p2",
    created_by: "staff2",
    title: "Kamera rendszer karbantartás – október",
    status: "sent",
    work_period_start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    work_period_end: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    total_hours: 4,
    worklog_ids: ["w2"],
    ticket_ids: [],
    client_name: "Szabó Anna",
    client_title: "Létesítménymenedzser",
    client_signature: null,
    signed_at: null,
    work_summary: "Havi rendes karbantartás elvégzése.",
    pdf_url: "#",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    _id: "cc3",
    certificate_number: "CC-000003",
    tenantId: "tenant1",
    contact_id: "Beta Logisztika Kft.",
    project_id: null,
    created_by: "staff1",
    title: "Raktár hálózatépítés",
    status: "draft",
    work_period_start: new Date(),
    work_period_end: new Date(),
    total_hours: 8,
    worklog_ids: [],
    ticket_ids: [],
    client_name: "",
    client_title: "",
    client_signature: null,
    signed_at: null,
    work_summary: "",
    pdf_url: null,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const statusVariant = {
  draft: "default",
  sent: "warning",
  accepted: "success",
  rejected: "error",
} as const;
const statusLabel = {
  draft: "Piszkozat",
  sent: "Aláírásra vár",
  accepted: "Aláírva",
  rejected: "Elutasítva",
} as const;

export default function CompletionCertificatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = mockCertificates.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.certificate_number.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_id ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    draft: mockCertificates.filter((c) => c.status === "draft").length,
    sent: mockCertificates.filter((c) => c.status === "sent").length,
    accepted: mockCertificates.filter((c) => c.status === "accepted").length,
  };

  const columns: Column<CompletionCertificate>[] = [
    {
      key: "certificate_number",
      header: "Igazolás",
      width: "120px",
      render: (row) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "var(--color-text-muted, #555)",
          }}
        >
          {row.certificate_number}
        </span>
      ),
    },
    {
      key: "title",
      header: "Tárgy",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>{row.title}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
            {row.contact_id ?? "—"} · {row.total_hours}h
          </div>
        </div>
      ),
    },
    {
      key: "work_period_start",
      header: "Teljesítési időszak",
      width: "180px",
      render: (row: CompletionCertificate) =>
        `${row.work_period_start ? new Date(row.work_period_start).toLocaleDateString() : "-"} - ${
          row.work_period_end ? new Date(row.work_period_end).toLocaleDateString() : "-"
        }`,
    },
    {
      key: "client_name",
      header: "Ügyfél aláíró",
      width: "150px",
      render: (row) => (
        <div>
          <div style={{ fontSize: "0.85rem" }}>{row.client_name || "—"}</div>
          {row.client_title && (
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
              {row.client_title}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Állapot",
      width: "140px",
      render: (row) => (
        <Badge
          variant={statusVariant[row.status as keyof typeof statusVariant] ?? "default"}
        >
          {statusLabel[row.status as keyof typeof statusLabel] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "pdf_url",
      header: "",
      width: "48px",
      render: (row) =>
        row.pdf_url ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(String(row.pdf_url), "_blank");
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted, #555)",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
            }}
            title="PDF letöltése"
          >
            <Download size={14} />
          </button>
        ) : null,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <PageHeader
        title="Teljesítési igazolások"
        subtitle="Szerződésekhez kapcsolódó teljesítési igazolások kezelése"
        actions={
          <Button
            variant="primary"
            onClick={() => router.push("/completion-certificates/new")}
          >
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új igazolás
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
            label: "Piszkozat",
            count: counts.draft,
            icon: <FileText size={16} />,
            color: "#6b7280",
          },
          {
            label: "Aláírásra vár",
            count: counts.sent,
            icon: <Clock size={16} />,
            color: "#f59e0b",
          },
          {
            label: "Aláírva",
            count: counts.accepted,
            icon: <CheckCircle size={16} />,
            color: "#22c55e",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
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

      <Card className="p-4">
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
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
              placeholder="Keresés igazolásban..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>
          <Button variant="secondary">
            <Filter size={15} style={{ marginRight: "6px" }} />
            Szűrők
          </Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table<CompletionCertificate>
          data={filtered}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/completion-certificates/${row._id}`)}
          emptyMessage="Nincs találat a keresési feltételekre"
        />
      </Card>
    </div>
  );
}
