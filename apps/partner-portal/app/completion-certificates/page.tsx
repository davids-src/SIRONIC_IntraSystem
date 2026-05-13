"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { CompletionCertificate } from "@crm/types";
import { Search, Download, Clock, CheckCircle, FileSignature } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api-client";
import { parseCompletionCertificate } from "@/lib/entity-parsers";

const statusVariant = {
  draft: "default",
  sent: "warning",
  accepted: "success",
  rejected: "error",
} as const;
const statusLabel = {
  draft: "Feldolgozás alatt",
  sent: "Aláírásra vár",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
} as const;

export default function PartnerCompletionCertificatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CompletionCertificate[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown[]>("/api/completion-certificates", {
          signal: ac.signal,
        });
        setRows(raw.map(parseCompletionCertificate));
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("Az igazolások nem tölthetők be.");
      }
    })();
    return () => ac.abort();
  }, []);

  const filtered = rows.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.certificate_number.toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    total: rows.length,
    pending: rows.filter((c) => c.status === "sent").length,
    accepted: rows.filter((c) => c.status === "accepted").length,
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
            Összesen: {row.total_hours} óra
          </div>
        </div>
      ),
    },
    {
      key: "work_period",
      header: "Időszak",
      width: "180px",
      render: (row) => (
        <span
          style={{ fontSize: "0.8rem", color: "var(--color-text-secondary, #a0a0a0)" }}
        >
          {row.work_period_start
            ? new Date(row.work_period_start).toLocaleDateString("hu-HU")
            : "—"}{" "}
          –{" "}
          {row.work_period_end
            ? new Date(row.work_period_end).toLocaleDateString("hu-HU")
            : "—"}
        </span>
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="Teljesítési igazolások"
        subtitle="Munkavégzések jóváhagyása és archiválása"
      />
      {loadErr && (
        <p className="text-sm text-red-400 px-1" role="alert">
          {loadErr}
        </p>
      )}

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
            icon: <FileSignature size={16} />,
            color: "#6b7280",
          },
          {
            label: "Teendő van (Aláírás)",
            count: counts.pending,
            icon: <Clock size={16} />,
            color: "#f59e0b",
          },
          {
            label: "Elfogadva",
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
              placeholder="Keresés igazolásokban..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table<CompletionCertificate>
          data={filtered}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/completion-certificates/${row._id}`)}
          emptyMessage="Nincs megjeleníthető igazolás"
        />
      </Card>
    </div>
  );
}
