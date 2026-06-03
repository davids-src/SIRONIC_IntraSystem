"use client";

import {
  Card,
  Button,
  Badge,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crm/ui";
import type { Contact, Worklog } from "@crm/types";
import {
  Search,
  Plus,
  Download,
  ClipboardList,
  CheckCircle,
  FileText,
  Filter,
  Archive,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type WorklogRow = Worklog & { contact_name: string };

function parseWorklog(raw: unknown, contactName: string): WorklogRow {
  const w = raw as Record<string, unknown>;
  return {
    ...(w as unknown as Worklog),
    contact_name: contactName,
    work_date: new Date(String(w["work_date"])),
    created_at: new Date(String(w["created_at"])),
    updated_at: new Date(String(w["updated_at"])),
  };
}

const statusConfig = {
  draft: { label: "Piszkozat", variant: "default" as const },
  finalized: { label: "Véglegesített", variant: "success" as const },
};

export default function WorklogsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState<WorklogRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<WorklogRow | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const loadData = async () => {
    try {
      const [rc, rw] = await Promise.all([
        fetch("/api/contacts"),
        fetch(`/api/worklogs?include_archived=${includeArchived}`),
      ]);
      if (!rc.ok || !rw.ok) {
        setLoadError("A munkalap lista nem elérhető.");
        return;
      }
      const contacts = (await rc.json()) as Contact[];
      const worklogsRaw = (await rw.json()) as unknown[];
      const nameById = new Map(contacts.map((c) => [c._id, c.name]));
      setRows(
        worklogsRaw.map((raw) => {
          const w = raw as Worklog;
          const nm = w.contact_id ? (nameById.get(w.contact_id) ?? w.contact_id) : "—";
          return parseWorklog(raw, nm);
        }),
      );
    } catch {
      setLoadError("A munkalap lista nem elérhető.");
    }
  };

  useEffect(() => {
    loadData();
  }, [includeArchived]);

  const handleArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveTarget) return;
    try {
      const res = await fetch(`/api/worklogs/${archiveTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_archived: true,
          archived_at: new Date(),
          archive_reason: archiveReason.trim(),
        }),
      });
      if (res.ok) {
        setArchiveTarget(null);
        setArchiveReason("");
        loadData();
      } else {
        alert("Sikertelen archiválás.");
      }
    } catch {
      alert("Sikertelen archiválás.");
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm("Biztosan vissza szeretnéd állítani ezt a munkalapot?")) return;
    try {
      const res = await fetch(`/api/worklogs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_archived: false,
          archived_at: null,
          archive_reason: null,
        }),
      });
      if (res.ok) {
        loadData();
      } else {
        alert("Sikertelen visszaállítás.");
      }
    } catch {
      alert("Sikertelen visszaállítás.");
    }
  };

  const filtered = rows.filter((w) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (w.worklog_number || "").toLowerCase().includes(q) ||
      (w.contact_name || "").toLowerCase().includes(q) ||
      (w.technician_name || "").toLowerCase().includes(q) ||
      (w.work_category || "").toLowerCase().includes(q);
    const matchStatus = !statusFilter || w.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: rows.length,
    draft: rows.filter((w) => w.status === "draft").length,
    finalized: rows.filter((w) => w.status === "finalized").length,
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

      {loadError ? (
        <p className="text-sm" style={{ color: "var(--color-danger, #f87171)" }}>
          {loadError}
        </p>
      ) : null}

      {/* Filters */}
      <div
        className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:flex-wrap sm:items-end"
        style={{
          background: "var(--color-bg-card)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <div className="relative min-w-[180px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <Input
            placeholder="Keresés munkalapban..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Keresés munkalapban"
          />
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:min-w-[200px]">
          <Label htmlFor="worklog-status-filter" className="sr-only">
            Állapot szűrő
          </Label>
          <Select
            value={statusFilter || "all"}
            onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
          >
            <SelectTrigger id="worklog-status-filter" className="w-full sm:w-[200px]">
              <SelectValue placeholder="Állapot" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Minden állapot</SelectItem>
              <SelectItem value="draft">Piszkozat</SelectItem>
              <SelectItem value="finalized">Véglegesített</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            id="wl-include-archived"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            style={{
              width: "16px",
              height: "16px",
              cursor: "pointer",
              accentColor: "var(--color-accent-primary)",
            }}
          />
          <label
            htmlFor="wl-include-archived"
            style={{
              fontSize: "0.875rem",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Archivált elemek megjelenítése
          </label>
        </div>
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
                              router.push(`/organizations/${w.contact_id}`);
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
                        <div
                          style={{ display: "flex", gap: "6px", alignItems: "center" }}
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
                            >
                              <Download size={15} />
                            </button>
                          )}
                          {w.is_archived ? (
                            <button
                              onClick={() => handleRestore(w._id)}
                              className="p-1.5 rounded-md transition-colors"
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--color-text-secondary)",
                              }}
                              title="Visszaállítás"
                            >
                              <RotateCcw size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setArchiveTarget(w);
                                setArchiveReason("");
                              }}
                              className="p-1.5 rounded-md transition-colors"
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--color-status-error, #f87171)",
                              }}
                              title="Archiválás"
                            >
                              <Archive size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {archiveTarget && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setArchiveTarget(null)}
        >
          <div
            className="rounded-xl border p-6"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              width: "100%",
              maxWidth: "450px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 12px 0", color: "#fff" }}>Munkalap archiválása</h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-muted)",
                marginBottom: "16px",
              }}
            >
              Biztosan archiválni szeretnéd:{" "}
              <strong>{archiveTarget.worklog_number}</strong>?<br />
              Kérjük, add meg az archiválás indokát.
            </p>
            <form
              onSubmit={handleArchive}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                  Archiválás oka *
                </label>
                <Input
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Pl. Duplikátum, hibás adatok..."
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setArchiveTarget(null)}
                >
                  Mégse
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  style={{
                    backgroundColor: "var(--color-status-error, #f87171)",
                    borderColor: "var(--color-status-error, #f87171)",
                  }}
                >
                  Archiválás
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
