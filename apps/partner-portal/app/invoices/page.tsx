"use client";

import { PageHeader, Card, Table, Badge, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { Invoice } from "@crm/types";
import { apiJson } from "@/lib/api-client";
import { parseInvoice } from "@/lib/entity-parsers";
import { Receipt, Search } from "lucide-react";
import { useEffect, useState } from "react";

const statusVariant = {
  draft: "default",
  sent: "info",
  paid: "success",
  overdue: "error",
  cancelled: "default",
} as const;
const statusLabel: Record<Invoice["status"], string> = {
  draft: "Piszkozat",
  sent: "Kiküldve",
  paid: "Fizetve",
  overdue: "Lejárt",
  cancelled: "Törölve",
};

export default function PartnerInvoicesPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown[]>("/api/invoices", { signal: ac.signal });
        setRows(raw.map(parseInvoice));
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("A számlák nem tölthetők be.");
      }
    })();
    return () => ac.abort();
  }, []);

  const filtered = rows.filter(
    (inv) =>
      (inv.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: Column<Invoice>[] = [
    {
      key: "invoice_number",
      header: "Számla",
      width: "120px",
      render: (row) => (
        <span className="font-mono text-xs text-[var(--color-text-muted)]">
          {row.invoice_number}
        </span>
      ),
    },
    {
      key: "title",
      header: "Megnevezés",
      render: (row) => <span className="font-medium">{row.title ?? "—"}</span>,
    },
    {
      key: "total_amount",
      header: "Összeg",
      width: "120px",
      render: (row) => (
        <span className="font-semibold">
          {new Intl.NumberFormat("hu-HU", {
            style: "currency",
            currency: row.currency || "HUF",
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
        <Badge variant={statusVariant[row.status] ?? "default"}>
          {statusLabel[row.status]}
        </Badge>
      ),
    },
    {
      key: "due_at",
      header: "Esedékes",
      width: "110px",
      render: (row) => (
        <span className="text-sm text-[var(--color-text-muted)]">
          {row.due_at ? row.due_at.toLocaleDateString("hu-HU") : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Számlák"
        subtitle="Kiküldött és kifizetett számlák"
        actions={
          <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
            <Receipt size={18} />
          </div>
        }
      />
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
        <Table<Invoice>
          data={filtered}
          columns={columns}
          keyField="_id"
          emptyMessage="Nincs megjeleníthető számla"
        />
      </Card>
    </div>
  );
}
