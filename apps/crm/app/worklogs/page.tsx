"use client";

import { Card, Button, Badge } from "@crm/ui";
import type { Worklog } from "@crm/types";
import {
  Search,
  Plus,
  Download,
  ClipboardList,
  CheckCircle,
  FileText,
  Filter,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const mockWorklogs: Array<Worklog & { contact_name: string }> = [
  {
    _id: "w1",
    worklog_number: "WL-000001",
    tenantId: "tenant1",
    contact_id: "org1",
    contact_name: "Tech Solutions Kft.",
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
    work_description: "Szerver hiba elhárítása, hálózati switch újraindítása.",
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
    contact_id: "org2",
    contact_name: "Alpha Épület Zrt.",
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
  {
    _id: "w3",
    worklog_number: "WL-000003",
    tenantId: "tenant1",
    contact_id: "org3",
    contact_name: "Beta Logisztika Kft.",
    one_time_contact_name: null,
    one_time_contact_phone: null,
    project_id: "p1",
    created_by: "staff2",
    ticket_id: null,
    status: "finalized",
    work_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    work_start: "09:00",
    work_end: "17:00",
    technician_name: "Nagy Péter",
    technician_signature: null,
    client_name: "Szabó Anna",
    client_signature: null,
    site_address: "Raktár, Miskolc",
    work_category: "Hálózatépítés",
    work_description: "Strukturált hálózat kiépítése a raktár épületben.",
    items: [],
    travel_km: 180,
    notes: "22 patch panel port bekötve.",
    pdf_url: "#",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

const statusConfig = {
  draft: { label: "Piszkozat", variant: "default" as const },
  finalized: { label: "Véglegesített", variant: "success" as const },
};

export default function WorklogsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = mockWorklogs.filter((w) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      w.worklog_number.toLowerCase().includes(q) ||
      w.contact_name.toLowerCase().includes(q) ||
      w.technician_name.toLowerCase().includes(q) ||
      w.work_category.toLowerCase().includes(q);
    const matchStatus = !statusFilter || w.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: mockWorklogs.length,
    draft: mockWorklogs.filter((w) => w.status === "draft").length,
    finalized: mockWorklogs.filter((w) => w.status === "finalized").length,
  };

  const stats = [
    {
      label: "Összes",
      count: counts.total,
      icon: <ClipboardList size={20} />,
      color: "#6b7280",
      bg: "rgba(107,114,128,0.1)",
    },
    {
      label: "Piszkozat",
      count: counts.draft,
      icon: <FileText size={20} />,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
    },
    {
      label: "Véglegesített",
      count: counts.finalized,
      icon: <CheckCircle size={20} />,
      color: "#22c55e",
      bg: "rgba(34,197,94,0.08)",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">Munkalapok</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Helyszíni és távoli munkavégzések adminisztrációja
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="primary" onClick={() => router.push("/worklogs/new")}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új munkalap
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((stat) => (
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

      {/* Filters */}
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
            className="w-full h-10 pl-9 pr-3 rounded-md text-sm bg-transparent border text-white placeholder:text-gray-500 outline-none"
            style={{
              borderColor: "var(--color-border-default)",
              background: "var(--color-bg-secondary)",
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-md text-sm border outline-none"
          style={{
            borderColor: "var(--color-border-default)",
            background: "var(--color-bg-secondary)",
            color: "var(--color-text-primary)",
          }}
        >
          <option value="">Minden állapot</option>
          <option value="draft">Piszkozat</option>
          <option value="finalized">Véglegesített</option>
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                className="border-b"
                style={{
                  background: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border-subtle)",
                }}
              >
                {[
                  "Munkalap",
                  "Feladat / Kontakt",
                  "Dátum",
                  "Technikus",
                  "Km",
                  "Állapot",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ borderColor: "var(--color-border-subtle)" }}>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Nincs találat
                  </td>
                </tr>
              ) : (
                filtered.map((w) => {
                  const sc = statusConfig[w.status as keyof typeof statusConfig];
                  return (
                    <tr
                      key={w._id}
                      className="border-b transition-colors cursor-pointer"
                      style={{ borderColor: "var(--color-border-subtle)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "var(--color-bg-secondary)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                      onClick={() => router.push(`/worklogs/${w._id}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="font-mono text-xs"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {w.worklog_number}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ maxWidth: "280px" }}>
                        <div className="font-medium text-sm text-white truncate">
                          {w.work_category}
                        </div>
                        <div
                          className="text-xs truncate"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          <span
                            className="hover:underline cursor-pointer"
                            style={{ color: "var(--color-accent-primary)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/contacts/${w.contact_id}`);
                            }}
                          >
                            {w.contact_name}
                          </span>
                          {" · "}
                          {w.site_address}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {new Date(w.work_date).toLocaleDateString("hu-HU")}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {w.work_start} – {w.work_end}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="text-sm"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {w.technician_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="text-sm"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {w.travel_km ?? 0} km
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={sc?.variant ?? "default"}>
                          {sc?.label ?? w.status}
                        </Badge>
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {w.pdf_url && (
                          <button
                            onClick={() => window.open(w.pdf_url!, "_blank")}
                            className="p-1.5 rounded-md transition-colors"
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--color-text-muted)",
                            }}
                            title="PDF letöltése"
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = "var(--color-bg-card)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <Download size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
