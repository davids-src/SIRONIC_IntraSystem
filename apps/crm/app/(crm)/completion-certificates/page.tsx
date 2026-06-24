"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { Contact, CompletionCertificate } from "@crm/types";
import {
  Search,
  Filter,
  Plus,
  Download,
  BadgeCheck,
  Clock,
  FileText,
  CheckCircle,
  Archive,
  RotateCcw,
  XCircle,
  Coins,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CertificateRow = CompletionCertificate & { contact_name: string };

function parseCertificate(raw: unknown, contactName: string): CertificateRow {
  const c = raw as Record<string, unknown>;
  return {
    ...(c as unknown as CompletionCertificate),
    contact_name: contactName,
    work_period_start: c["work_period_start"]
      ? new Date(String(c["work_period_start"]))
      : null,
    work_period_end: c["work_period_end"] ? new Date(String(c["work_period_end"])) : null,
    signed_at: c["signed_at"] ? new Date(String(c["signed_at"])) : null,
    created_at: new Date(String(c["created_at"])),
    updated_at: new Date(String(c["updated_at"])),
  };
}

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
  const [rows, setRows] = useState<CertificateRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<CertificateRow | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const loadData = async () => {
    try {
      const rc = await fetch("/api/contacts");
      const rcc = await fetch(
        `/api/completion-certificates?include_archived=${includeArchived}`,
      );
      if (!rc.ok || !rcc.ok) {
        setLoadError("Az igazolás lista nem elérhető.");
        return;
      }
      const contacts = (await rc.json()) as Contact[];
      const certsRaw = (await rcc.json()) as unknown[];
      const nameById = new Map(contacts.map((c) => [c._id, c.name]));
      setRows(
        certsRaw.map((raw) => {
          const c = raw as CompletionCertificate;
          const cid = c.contact_id ?? "";
          const nm = cid ? (nameById.get(cid) ?? cid) : "—";
          return parseCertificate(raw, nm);
        }),
      );
    } catch {
      setLoadError("Az igazolás lista nem elérhető.");
    }
  };

  useEffect(() => {
    loadData();
  }, [includeArchived]);

  const handleArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveTarget) return;
    try {
      const res = await fetch(`/api/completion-certificates/${archiveTarget._id}`, {
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
    if (!confirm("Biztosan vissza szeretnéd állítani ezt az elemet az archívumból?"))
      return;
    try {
      const res = await fetch(`/api/completion-certificates/${id}`, {
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

  const filtered = rows.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.certificate_number.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    draft: rows.filter((c) => c.status === "draft").length,
    sent: rows.filter((c) => c.status === "sent").length,
    accepted: rows.filter((c) => c.status === "accepted").length,
    rejected: rows.filter((c) => c.status === "rejected").length,
  };

  const signedValue = rows
    .filter((c) => c.status === "accepted")
    .reduce((sum, c) => {
      const lineSum = c.lines
        ? c.lines.reduce((s, l) => s + l.quantity * (l.net_unit_price || 0), 0)
        : 0;
      return sum + lineSum;
    }, 0);

  const pendingValue = rows
    .filter((c) => c.status === "sent")
    .reduce((sum, c) => {
      const lineSum = c.lines
        ? c.lines.reduce((s, l) => s + l.quantity * (l.net_unit_price || 0), 0)
        : 0;
      return sum + lineSum;
    }, 0);

  const columns: Column<CertificateRow>[] = [
    {
      key: "certificate_number",
      header: "Igazolás",
      width: "140px",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "0.8rem",
              color: "var(--color-text-muted, #555)",
            }}
          >
            {row.certificate_number}
          </span>
          {row.is_archived && (
            <Badge variant="error" style={{ fontSize: "10px", padding: "1px 4px" }}>
              Archivált
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "title",
      header: "Tárgy",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>{row.title}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
            {row.contact_name ?? "—"} · {row.total_hours}h
          </div>
        </div>
      ),
    },
    {
      key: "work_period_start",
      header: "Teljesítési időszak",
      width: "180px",
      render: (row: CertificateRow) =>
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
      key: "actions",
      header: "Műveletek",
      width: "100px",
      render: (row) => (
        <div
          style={{ display: "flex", gap: "8px", alignItems: "center" }}
          onClick={(e) => e.stopPropagation()}
        >
          {row.pdf_url && (
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
          )}
          {row.is_archived ? (
            <button
              onClick={() => handleRestore(row._id)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-secondary, #a0a0a0)",
                padding: "4px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
              }}
              title="Visszaállítás"
            >
              <RotateCcw size={14} />
            </button>
          ) : (
            <button
              onClick={() => {
                setArchiveTarget(row);
                setArchiveReason("");
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--color-status-error, #f87171)",
                padding: "4px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
              }}
              title="Archiválás"
            >
              <Archive size={14} />
            </button>
          )}
        </div>
      ),
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
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        {[
          {
            label: "Aláírt Igazolások Értéke",
            value: `${signedValue.toLocaleString("hu-HU")} Ft`,
            icon: <Coins size={16} />,
            color: "#22c55e",
          },
          {
            label: "Függőben lévő Érték",
            value: `${pendingValue.toLocaleString("hu-HU")} Ft`,
            icon: <Coins size={16} />,
            color: "#f59e0b",
          },
          {
            label: "Aláírva",
            value: String(counts.accepted),
            icon: <CheckCircle size={16} />,
            color: "#22c55e",
          },
          {
            label: "Aláírásra vár",
            value: String(counts.sent),
            icon: <Clock size={16} />,
            color: "#f59e0b",
          },
          {
            label: "Elutasítva",
            value: String(counts.rejected),
            icon: <XCircle size={16} />,
            color: "#f87171",
          },
          {
            label: "Piszkozat",
            value: String(counts.draft),
            icon: <FileText size={16} />,
            color: "#6b7280",
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
              {stat.value}
            </div>
          </Card>
        ))}
      </div>

      {loadError ? (
        <p className="text-sm" style={{ color: "var(--color-danger, #f87171)" }}>
          {loadError}
        </p>
      ) : null}

      <Card className="p-4">
        <div
          style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}
        >
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginRight: "12px",
            }}
          >
            <input
              type="checkbox"
              id="include-archived"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              style={{
                width: "16px",
                height: "16px",
                cursor: "pointer",
                accentColor: "var(--color-accent-primary, #3b82f6)",
              }}
            />
            <label
              htmlFor="include-archived"
              style={{
                fontSize: "0.875rem",
                color: "var(--color-text-secondary, #a0a0a0)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Archivált elemek megjelenítése
            </label>
          </div>

          <Button variant="secondary">
            <Filter size={15} style={{ marginRight: "6px" }} />
            Szűrők
          </Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table<CertificateRow>
          data={filtered}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/completion-certificates/${row._id}`)}
          emptyMessage="Nincs találat a keresési feltételekre"
        />
      </Card>

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
          <Card
            style={{ padding: "24px", width: "100%", maxWidth: "450px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 16px 0", color: "#fff" }}>Bizonylat archiválása</h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-muted)",
                marginBottom: "16px",
              }}
            >
              Biztosan archiválni szeretnéd a következő bizonylatot:{" "}
              <strong>{archiveTarget.certificate_number}</strong>?<br />
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
                  placeholder="Pl. Elavult, hibás bejegyzés..."
                  required
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
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
          </Card>
        </div>
      )}
    </div>
  );
}
