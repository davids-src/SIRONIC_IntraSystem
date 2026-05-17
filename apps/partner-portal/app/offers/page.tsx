"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import { Search, FileText, CheckCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Offer } from "@crm/types";
import { apiJson } from "@/lib/api-client";
import { parseOffer } from "@/lib/entity-parsers";

const statusVariant = {
  draft: "default",
  sent: "info",
  accepted: "success",
  rejected: "error",
} as const;
const statusLabel: Record<Offer["status"], string> = {
  draft: "Piszkozat",
  sent: "Döntésre vár",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
};

export default function PartnerOffersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Offer[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown[]>("/api/offers", { signal: ac.signal });
        setRows(raw.map(parseOffer));
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("Az ajánlatok nem tölthetők be.");
      }
    })();
    return () => ac.abort();
  }, []);

  const filtered = rows.filter(
    (o) =>
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.offer_number.toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    total: rows.length,
    pending: rows.filter((o) => o.status === "sent").length,
    accepted: rows.filter((o) => o.status === "accepted").length,
  };

  const columns: Column<Offer>[] = [
    {
      key: "offer_number",
      header: "Azonosító",
      width: "120px",
      render: (row) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "var(--color-text-muted, #555)",
          }}
        >
          {row.offer_number}
        </span>
      ),
    },
    {
      key: "title",
      header: "Ajánlat tárgya",
      render: (row) => <div style={{ fontWeight: 600 }}>{row.title}</div>,
    },
    {
      key: "total_amount",
      header: "Összeg",
      width: "140px",
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          {new Intl.NumberFormat("hu-HU", {
            style: "currency",
            currency: "HUF",
            maximumFractionDigits: 0,
          }).format(row.total_amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Állapot",
      width: "140px",
      render: (row) => (
        <Badge variant={statusVariant[row.status] ?? "default"}>
          {statusLabel[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "valid_until",
      header: "Érvényesség",
      width: "120px",
      render: (row) => {
        const d = row.valid_until;
        const expired = d && d < new Date() && row.status === "sent";
        return (
          <span
            style={{
              fontSize: "0.8rem",
              color: expired ? "#e53935" : "var(--color-text-primary, #fff)",
            }}
          >
            {d ? d.toLocaleDateString("hu-HU") : "—"}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="Ajánlatok"
        subtitle="Kapott árajánlatok áttekintése és jóváhagyása"
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
            label: "Összes ajánlat",
            count: counts.total,
            icon: <FileText size={16} />,
            color: "#6b7280",
          },
          {
            label: "Döntésre vár",
            count: counts.pending,
            icon: <Clock size={16} />,
            color: "#3b82f6",
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
              placeholder="Keresés ajánlatban..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table<Offer>
          data={filtered}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/offers/${row._id}`)}
          emptyMessage="Nincs megjeleníthető ajánlat"
        />
      </Card>
    </div>
  );
}
