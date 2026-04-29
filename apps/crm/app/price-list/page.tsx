"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import { Search, Plus, Filter, Tag, Layers, Server } from "lucide-react";
import { useState } from "react";

interface PriceItem {
  _id: string;
  code: string;
  name: string;
  category: "hardware" | "software" | "service" | "license";
  unit: string;
  unit_price: number;
  tax_percent: number;
  description: string;
  status: "active" | "archived";
}

const mockPrices: PriceItem[] = [
  {
    _id: "p1",
    code: "SRV-INST-01",
    name: "Szerver fizikai telepítése és rackezése",
    category: "service",
    unit: "óra",
    unit_price: 25000,
    tax_percent: 27,
    description: "Szerver beépítése, kábelezése, alapvető tesztek",
    status: "active",
  },
  {
    _id: "p2",
    code: "NET-CONF-01",
    name: "Hálózati switch konfiguráció (L2/L3)",
    category: "service",
    unit: "óra",
    unit_price: 30000,
    tax_percent: 27,
    description: "VLAN-ok, útválasztás, port security beállítása",
    status: "active",
  },
  {
    _id: "p3",
    code: "HW-SRV-STD",
    name: "Standard 1U Rack Szerver (Alapkonfig)",
    category: "hardware",
    unit: "db",
    unit_price: 850000,
    tax_percent: 27,
    description: "1U szerver, 32GB RAM, 2x 1TB SSD, 1x CPU",
    status: "active",
  },
  {
    _id: "p4",
    code: "SW-MS-365",
    name: "Microsoft 365 Business Standard",
    category: "license",
    unit: "felh/hó",
    unit_price: 4500,
    tax_percent: 27,
    description: "Havi előfizetés felhasználónként",
    status: "active",
  },
  {
    _id: "p5",
    code: "SRV-MNT-OLD",
    name: "Régi szerver karbantartás (Kivezetve)",
    category: "service",
    unit: "óra",
    unit_price: 15000,
    tax_percent: 27,
    description: "Már nem támogatott szerverek karbantartása",
    status: "archived",
  },
];

const categoryVariant = {
  hardware: "default",
  software: "info",
  service: "warning",
  license: "success",
} as const;

const categoryLabel = {
  hardware: "Hardver",
  software: "Szoftver",
  service: "Szolgáltatás",
  license: "Licenc",
};

export default function PriceListPage() {
  const [search, setSearch] = useState("");

  const filtered = mockPrices.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      categoryLabel[p.category].toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    total: mockPrices.length,
    active: mockPrices.filter((p) => p.status === "active").length,
    services: mockPrices.filter((p) => p.category === "service").length,
  };

  const columns: Column<PriceItem>[] = [
    {
      key: "code",
      header: "Cikkszám",
      width: "130px",
      render: (row) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "var(--color-text-muted, #555)",
          }}
        >
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Megnevezés",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.name}</div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-muted, #555)",
              marginTop: "2px",
            }}
          >
            {row.description}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Kategória",
      width: "140px",
      render: (row) => (
        <Badge variant={categoryVariant[row.category]}>
          {categoryLabel[row.category]}
        </Badge>
      ),
    },
    {
      key: "unit_price",
      header: "Egységár",
      width: "130px",
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          {new Intl.NumberFormat("hu-HU", {
            style: "currency",
            currency: "HUF",
            maximumFractionDigits: 0,
          }).format(row.unit_price)}
        </span>
      ),
    },
    {
      key: "unit",
      header: "Mértékegység",
      width: "120px",
      render: (row) => (
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
          {row.unit}
        </span>
      ),
    },
    {
      key: "tax_percent",
      header: "ÁFA",
      width: "80px",
      render: (row) => (
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
          {row.tax_percent}%
        </span>
      ),
    },
    {
      key: "status",
      header: "Állapot",
      width: "100px",
      render: (row) => (
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            color: row.status === "active" ? "#22c55e" : "var(--color-text-muted, #555)",
            background:
              row.status === "active"
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(255,255,255,0.05)",
            padding: "2px 8px",
            borderRadius: "4px",
          }}
        >
          {row.status === "active" ? "Aktív" : "Archivált"}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="Árlista"
        subtitle="Szolgáltatások, hardverek és licencek alapárai ajánlatkészítéshez"
        actions={
          <Button variant="primary">
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új tétel
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
            label: "Összes tétel",
            count: counts.total,
            icon: <Layers size={16} />,
            color: "#6b7280",
          },
          {
            label: "Aktív tételek",
            count: counts.active,
            icon: <Tag size={16} />,
            color: "#22c55e",
          },
          {
            label: "Szolgáltatások",
            count: counts.services,
            icon: <Server size={16} />,
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
              placeholder="Keresés cikkszám vagy megnevezés alapján..."
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
        <Table<PriceItem>
          data={filtered}
          columns={columns}
          keyField="_id"
          emptyMessage="Nincs találat a keresési feltételekre"
        />
      </Card>
    </div>
  );
}
