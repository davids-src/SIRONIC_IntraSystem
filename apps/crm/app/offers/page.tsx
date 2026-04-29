"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import { Search, Filter, Plus, FileText, CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Offer {
  _id: string;
  offer_number: string;
  title: string;
  contact_id: string;
  total_amount: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  valid_until: Date;
  created_at: Date;
}

const mockOffers: Offer[] = [
  {
    _id: "o1",
    offer_number: "OFF-2024-001",
    title: "Szerver infrastruktúra kiépítése",
    contact_id: "Tech Solutions Kft.",
    total_amount: 1250000,
    status: "accepted",
    valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    _id: "o2",
    offer_number: "OFF-2024-002",
    title: "Kamerarendszer bővítés",
    contact_id: "Alpha Épület Zrt.",
    total_amount: 450000,
    status: "sent",
    valid_until: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    _id: "o3",
    offer_number: "OFF-2024-003",
    title: "Hálózati eszközök beszerzése",
    contact_id: "Beta Logisztika Kft.",
    total_amount: 890000,
    status: "rejected",
    valid_until: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
];

const statusVariant = {
  draft: "default",
  sent: "info",
  accepted: "success",
  rejected: "error",
} as const;
const statusLabel = {
  draft: "Piszkozat",
  sent: "Elküldve",
  accepted: "Elfogadva",
  rejected: "Elutasítva",
} as const;

export default function OffersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = mockOffers.filter(
    (o) =>
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.offer_number.toLowerCase().includes(search.toLowerCase()) ||
      o.contact_id.toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    sent: mockOffers.filter((o) => o.status === "sent").length,
    accepted: mockOffers.filter((o) => o.status === "accepted").length,
    rejected: mockOffers.filter((o) => o.status === "rejected").length,
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
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>{row.title}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
            {row.contact_id}
          </div>
        </div>
      ),
    },
    {
      key: "total_amount",
      header: "Összeg",
      width: "120px",
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
      width: "120px",
      render: (row) => (
        <Badge variant={statusVariant[row.status]}>{statusLabel[row.status]}</Badge>
      ),
    },
    {
      key: "valid_until",
      header: "Érvényesség",
      width: "120px",
      render: (row) => {
        const d = new Date(row.valid_until);
        const expired = d < new Date() && row.status === "sent";
        return (
          <span
            style={{
              fontSize: "0.8rem",
              color: expired ? "#e53935" : "var(--color-text-primary, #fff)",
            }}
          >
            {d.toLocaleDateString("hu-HU")}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="Ajánlatok"
        subtitle="Ügyfélajánlatok készítése, kiküldése és nyomon követése"
        actions={
          <Button variant="primary" onClick={() => router.push("/offers/new")}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új ajánlat
          </Button>
        }
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
            label: "Nyitott",
            count: counts.sent,
            icon: <FileText size={16} />,
            color: "#3b82f6",
          },
          {
            label: "Elfogadva",
            count: counts.accepted,
            icon: <CheckCircle size={16} />,
            color: "#22c55e",
          },
          {
            label: "Elutasítva",
            count: counts.rejected,
            icon: <XCircle size={16} />,
            color: "#e53935",
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
          <Button variant="secondary">
            <Filter size={15} style={{ marginRight: "6px" }} />
            Szűrők
          </Button>
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
