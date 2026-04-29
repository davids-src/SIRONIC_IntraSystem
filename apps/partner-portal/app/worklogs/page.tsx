"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import {
  Search,
  Filter,
  Download,
  ClipboardList,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Worklog } from "@crm/types";

// Mock data (Partner Portal side)
const myWorklogs: Worklog[] = [
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
    client_signature: "signed",
    site_address: "Központi iroda, Budapest",
    work_category: "IT támogatás",
    work_description: "Szerver hiba elhárítása, hálózati switch újraindítása.",
    items: [],
    travel_km: 15,
    notes: "",
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

const statusVariant = { draft: "default", finalized: "success" } as const;
const statusLabel = { draft: "Folyamatban", finalized: "Véglegesített" } as const;

export default function PartnerWorklogsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = myWorklogs.filter(
    (w) =>
      w.worklog_number.toLowerCase().includes(search.toLowerCase()) ||
      w.work_category.toLowerCase().includes(search.toLowerCase()) ||
      w.technician_name.toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    total: myWorklogs.length,
    finalized: myWorklogs.filter((w) => w.status === "finalized").length,
    draft: myWorklogs.filter((w) => w.status === "draft").length,
  };

  const columns: Column<Worklog>[] = [
    {
      key: "worklog_number",
      header: "Munkalap",
      width: "120px",
      render: (row) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "var(--color-text-muted, #555)",
          }}
        >
          {row.worklog_number}
        </span>
      ),
    },
    {
      key: "work_description",
      header: "Feladat",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>{row.work_category}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
            {row.site_address}
          </div>
        </div>
      ),
    },
    {
      key: "work_date",
      header: "Időpont",
      width: "140px",
      render: (row) => (
        <div>
          <div style={{ fontSize: "0.85rem" }}>
            {new Date(row.work_date).toLocaleDateString("hu-HU")}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
            {row.work_start} – {row.work_end}
          </div>
        </div>
      ),
    },
    {
      key: "technician",
      header: "Sironic Technikus",
      width: "150px",
      render: (row) => (
        <span
          style={{ fontSize: "0.825rem", color: "var(--color-text-secondary, #a0a0a0)" }}
        >
          {row.technician_name}
        </span>
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="Munkalapok"
        subtitle="Önhöz kapcsolódó szervizes és projekt munkalapok"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "12px",
        }}
      >
        {[
          {
            label: "Összes",
            count: counts.total,
            icon: <ClipboardList size={16} />,
            color: "#3b82f6",
          },
          {
            label: "Folyamatban",
            count: counts.draft,
            icon: <Clock size={16} />,
            color: "#f59e0b",
          },
          {
            label: "Elkészült",
            count: counts.finalized,
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
              placeholder="Keresés munkalapban..."
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
        <Table<Worklog>
          data={filtered}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/worklogs/${row._id}`)}
          emptyMessage="Nincs megjeleníthető munkalap"
        />
      </Card>
    </div>
  );
}
