"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import { Search, Download, Box, Laptop, Shield, SearchIcon } from "lucide-react";
import { useState } from "react";

type InventoryItem = {
  id: string;
  name: string;
  category: "hardware" | "software" | "license";
  serialNumber: string;
  status: "active" | "maintenance" | "retired";
  assignedTo: string;
  warrantyEnd: string;
};

const mockInventory: InventoryItem[] = [
  {
    id: "INV-001",
    name: "Dell Latitude 5530 Laptop",
    category: "hardware",
    serialNumber: "DL-5530-X92",
    status: "active",
    assignedTo: "Kovács János",
    warrantyEnd: "2027-12-31",
  },
  {
    id: "INV-002",
    name: "Cisco Meraki MS120 Switch",
    category: "hardware",
    serialNumber: "Q2MW-XXXX-YYYY",
    status: "active",
    assignedTo: "Központi iroda",
    warrantyEnd: "2026-06-15",
  },
  {
    id: "INV-003",
    name: "Microsoft 365 Business Premium",
    category: "license",
    serialNumber: "M365-BP-100",
    status: "active",
    assignedTo: "Mindenki",
    warrantyEnd: "2025-01-01",
  },
  {
    id: "INV-004",
    name: "HP LaserJet Enterprise",
    category: "hardware",
    serialNumber: "HP-LE-999",
    status: "maintenance",
    assignedTo: "Központi iroda",
    warrantyEnd: "2024-11-20",
  },
];

const categoryIcons = {
  hardware: <Laptop size={14} />,
  software: <Box size={14} />,
  license: <Shield size={14} />,
};

const categoryLabels = {
  hardware: "Hardver",
  software: "Szoftver",
  license: "Licenc",
};

const statusVariant = {
  active: "success",
  maintenance: "warning",
  retired: "default",
} as const;

const statusLabels = {
  active: "Aktív",
  maintenance: "Karbantartás alatt",
  retired: "Kivezetve",
};

export default function PartnerInventoryPage() {
  const [search, setSearch] = useState("");

  const filtered = mockInventory.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.assignedTo.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: Column<InventoryItem>[] = [
    {
      key: "name",
      header: "Eszköz neve",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.name}</div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginTop: "2px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {categoryIcons[row.category]} {categoryLabels[row.category]}
          </div>
        </div>
      ),
    },
    {
      key: "serialNumber",
      header: "Azonosító / Gyári szám",
      render: (row) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
          }}
        >
          {row.serialNumber}
        </span>
      ),
    },
    {
      key: "assignedTo",
      header: "Hozzárendelve",
    },
    {
      key: "status",
      header: "Állapot",
      width: "140px",
      render: (row) => (
        <Badge variant={statusVariant[row.status]}>{statusLabels[row.status]}</Badge>
      ),
    },
    {
      key: "warrantyEnd",
      header: "Garancia vége",
      width: "120px",
      render: (row) => {
        const isExpired = new Date(row.warrantyEnd) < new Date();
        return (
          <span
            style={{
              color: isExpired ? "var(--status-error)" : "inherit",
              fontSize: "0.875rem",
            }}
          >
            {row.warrantyEnd}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Eszköznyilvántartás"
        subtitle="A szervezetéhez rendelt hardverek, szoftverek és licencek áttekintése"
        actions={
          <Button variant="secondary">
            <Download size={16} style={{ marginRight: "8px" }} />
            Exportálás PDF-be
          </Button>
        }
      />

      <Card className="p-4">
        <div style={{ position: "relative", maxWidth: "400px" }}>
          <SearchIcon
            size={16}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <Input
            label=""
            placeholder="Keresés eszköznév, azonosító vagy felelős alapján..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "36px", margin: 0 }}
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table<InventoryItem>
          data={filtered}
          columns={columns}
          keyField="id"
          emptyMessage="Nincs megjeleníthető eszköz."
        />
      </Card>
    </div>
  );
}
