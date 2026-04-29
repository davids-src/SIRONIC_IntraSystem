"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import { Search, Plus, Building2, Users, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface MockOrg {
  _id: string;
  name: string;
  type: string;
  contact_person: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  open_tickets: number;
  active_projects: number;
}

const mockOrgs: MockOrg[] = [
  {
    _id: "org1",
    name: "Tech Solutions Kft.",
    type: "IT Partner",
    contact_person: "Nagy Péter",
    email: "peter@techsolutions.hu",
    phone: "+36 30 123 4567",
    status: "active",
    open_tickets: 3,
    active_projects: 2,
  },
  {
    _id: "org2",
    name: "Alpha Épület Zrt.",
    type: "Épületüzemeltető",
    contact_person: "Szabó Anna",
    email: "anna@alpha.hu",
    phone: "+36 20 987 6543",
    status: "active",
    open_tickets: 1,
    active_projects: 1,
  },
  {
    _id: "org3",
    name: "Beta Logisztika Kft.",
    type: "Logisztika",
    contact_person: "Kiss Gábor",
    email: "gabor@beta.hu",
    phone: "+36 70 555 4444",
    status: "active",
    open_tickets: 0,
    active_projects: 1,
  },
  {
    _id: "org4",
    name: "Delta Kereskedelem Bt.",
    type: "Kereskedelem",
    contact_person: "Molnár Éva",
    email: "eva@delta.hu",
    phone: "+36 30 222 3333",
    status: "inactive",
    open_tickets: 0,
    active_projects: 0,
  },
];

export default function ContactsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = mockOrgs.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.contact_person.toLowerCase().includes(search.toLowerCase()) ||
      o.email.toLowerCase().includes(search.toLowerCase()) ||
      o.type.toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    total: mockOrgs.length,
    active: mockOrgs.filter((o) => o.status === "active").length,
    withTickets: mockOrgs.filter((o) => o.open_tickets > 0).length,
  };

  const columns: Column<MockOrg>[] = [
    {
      key: "name",
      header: "Szervezet",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              flexShrink: 0,
              background: "var(--color-accent-bg, #3b0a0a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "#e53935",
            }}
          >
            {row.name.slice(0, 1)}
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: "2px" }}>{row.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
              {row.type}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "contact_person",
      header: "Kapcsolattartó",
      render: (row) => (
        <div>
          <div style={{ fontSize: "0.875rem" }}>{row.contact_person}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
            {row.email}
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Telefon",
      width: "150px",
      render: (row) => (
        <span
          style={{ fontSize: "0.8rem", color: "var(--color-text-secondary, #a0a0a0)" }}
        >
          {row.phone}
        </span>
      ),
    },
    {
      key: "open_tickets",
      header: "Ticketek",
      width: "100px",
      render: (row) =>
        row.open_tickets > 0 ? (
          <Badge variant="warning">{row.open_tickets} nyitott</Badge>
        ) : (
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
            —
          </span>
        ),
    },
    {
      key: "active_projects",
      header: "Projektek",
      width: "110px",
      render: (row) =>
        row.active_projects > 0 ? (
          <Badge variant="info">{row.active_projects} aktív</Badge>
        ) : (
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
            —
          </span>
        ),
    },
    {
      key: "status",
      header: "Állapot",
      width: "100px",
      render: (row) => (
        <Badge variant={row.status === "active" ? "success" : "default"}>
          {row.status === "active" ? "Aktív" : "Inaktív"}
        </Badge>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="Kontaktok"
        subtitle="Ügyfelek és partnerszervezetek kezelése"
        actions={
          <Button variant="primary" onClick={() => router.push("/contacts/new")}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új kontakt
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
            label: "Összes",
            count: counts.total,
            icon: <Building2 size={16} />,
            color: "#6b7280",
          },
          {
            label: "Aktív",
            count: counts.active,
            icon: <Users size={16} />,
            color: "#22c55e",
          },
          {
            label: "Nyitott ticket",
            count: counts.withTickets,
            icon: <Globe size={16} />,
            color: "#f59e0b",
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
              placeholder="Keresés kontaktban..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table<MockOrg>
          data={filtered}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/contacts/${row._id}`)}
          emptyMessage="Nincs találat a keresési feltételekre"
        />
      </Card>
    </div>
  );
}
