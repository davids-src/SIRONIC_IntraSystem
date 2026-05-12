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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 min-w-0">
        <h1 className="text-2xl font-bold text-white truncate">Munkalapok</h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Önhöz kapcsolódó szervizes és projekt munkalapok
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            label: "Összes",
            count: counts.total,
            icon: <ClipboardList size={20} />,
            color: "#3b82f6",
            bg: "rgba(59,130,246,0.08)",
          },
          {
            label: "Folyamatban",
            count: counts.draft,
            icon: <Clock size={20} />,
            color: "#f59e0b",
            bg: "rgba(245,158,11,0.08)",
          },
          {
            label: "Elkészült",
            count: counts.finalized,
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
                className="text-sm truncate"
                style={{ color: "var(--color-text-muted)" }}
              >
                {stat.label}
              </span>
            </div>
          </div>
        ))}
      </div>

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
            placeholder="Keresés munkalapban..."
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

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <div className="overflow-x-auto">
          <Table<Worklog>
            data={filtered}
            columns={columns}
            keyField="_id"
            onRowClick={(row) => router.push(`/worklogs/${row._id}`)}
            emptyMessage="Nincs megjeleníthető munkalap"
          />
        </div>
      </div>
    </div>
  );
}
