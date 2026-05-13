"use client";

import { PageHeader, Card, Table, Badge, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { InventoryItem } from "@crm/types";
import { apiJson } from "@/lib/api-client";
import { parseInventoryItem } from "@/lib/entity-parsers";
import { Search, Box, Laptop, Shield } from "lucide-react";
import { useEffect, useState } from "react";

const catIcon = {
  hardware: <Box size={14} />,
  software: <Laptop size={14} />,
  license: <Shield size={14} />,
} as const;

const catLabel = {
  hardware: "Hardver",
  software: "Szoftver",
  license: "Licenc",
} as const;

export default function PartnerInventoryPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown[]>("/api/inventory", { signal: ac.signal });
        setRows(raw.map(parseInventoryItem));
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("A leltár nem tölthető be.");
      }
    })();
    return () => ac.abort();
  }, []);

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.serial_number ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const columns: Column<InventoryItem>[] = [
    {
      key: "name",
      header: "Eszköz",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-muted)]">{catIcon[row.category]}</span>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Típus",
      width: "100px",
      render: (row) => <Badge variant="default">{catLabel[row.category]}</Badge>,
    },
    {
      key: "serial_number",
      header: "SN",
      width: "140px",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--color-text-muted)]">
          {row.serial_number ?? "—"}
        </span>
      ),
    },
    {
      key: "warranty_end",
      header: "Garancia",
      width: "110px",
      render: (row) => (
        <span className="text-sm text-[var(--color-text-muted)]">
          {row.warranty_end ? row.warranty_end.toLocaleDateString("hu-HU") : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Státusz",
      width: "100px",
      render: (row) => (
        <Badge variant={row.status === "active" ? "success" : "default"}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Leltár" subtitle="Regisztrált eszközök és licencek" />
      {loadErr && (
        <p className="text-sm text-red-400 px-1" role="alert">
          {loadErr}
        </p>
      )}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
          />
          <Input
            label=""
            placeholder="Keresés…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>
      <Card className="p-0 overflow-hidden">
        <Table<InventoryItem>
          data={filtered}
          columns={columns}
          keyField="_id"
          emptyMessage="Nincs leltári tétel"
        />
      </Card>
    </div>
  );
}
