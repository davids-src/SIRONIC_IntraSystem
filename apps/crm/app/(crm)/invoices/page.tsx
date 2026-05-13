"use client";

import { PageHeader, Card, Table, Badge, Button, Input } from "@crm/ui";
import type { Column } from "@crm/ui";
import type { Contact, Invoice } from "@crm/types";
import { Search, Plus, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type InvoiceRow = Invoice & { contact_name: string };

function parseInvoice(raw: unknown, contactName: string): InvoiceRow {
  const inv = raw as Record<string, unknown>;
  return {
    ...(inv as Invoice),
    contact_name: contactName,
    issued_at: inv["issued_at"] ? new Date(String(inv["issued_at"])) : null,
    due_at: inv["due_at"] ? new Date(String(inv["due_at"])) : null,
    created_at: new Date(String(inv["created_at"])),
    updated_at: new Date(String(inv["updated_at"])),
  };
}

const statusVariant = {
  draft: "default",
  sent: "info",
  paid: "success",
  overdue: "error",
  cancelled: "default",
} as const;

const statusLabel: Record<string, string> = {
  draft: "Piszkozat",
  sent: "Kiküldve",
  paid: "Fizetve",
  overdue: "Lejárt",
  cancelled: "Törölve",
};

export default function InvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const [rc, ri] = await Promise.all([
          fetch("/api/contacts", { signal: ac.signal }),
          fetch("/api/invoices", { signal: ac.signal }),
        ]);
        if (!rc.ok || !ri.ok) {
          setLoadError("A számla lista nem elérhető.");
          return;
        }
        const contacts = (await rc.json()) as Contact[];
        const invRaw = (await ri.json()) as unknown[];
        const nameById = new Map(contacts.map((c) => [c._id, c.name]));
        setRows(
          invRaw.map((raw) => {
            const inv = raw as Invoice;
            const nm = nameById.get(inv.contact_id) ?? inv.contact_id;
            return parseInvoice(raw, nm);
          }),
        );
      } catch {
        if (!ac.signal.aborted) {
          setLoadError("A számla lista nem elérhető.");
        }
      }
    })();
    return () => ac.abort();
  }, []);

  const filtered = rows.filter(
    (o) =>
      (o.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      o.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      o.contact_name.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: Column<InvoiceRow>[] = [
    {
      key: "invoice_number",
      header: "Számla",
      width: "120px",
      render: (row) => (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "var(--color-text-muted, #555)",
          }}
        >
          {row.invoice_number}
        </span>
      ),
    },
    {
      key: "title",
      header: "Tárgy",
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: "2px" }}>{row.title || "—"}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted, #555)" }}>
            {row.contact_name}
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
        <Badge
          variant={statusVariant[row.status as keyof typeof statusVariant] ?? "default"}
        >
          {statusLabel[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      key: "due_at",
      header: "Esedékesség",
      width: "120px",
      render: (row) => (
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted, #555)" }}>
          {row.due_at ? new Date(row.due_at).toLocaleDateString("hu-HU") : "—"}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <PageHeader
        title="Számlák"
        subtitle="Kimenő számlák áttekintése (CRM rekordok)"
        actions={
          <Button variant="primary" onClick={() => router.push("/invoices/new")}>
            <Plus size={16} style={{ marginRight: "6px" }} />
            Új számla
          </Button>
        }
      />

      {loadError ? (
        <p className="text-sm" style={{ color: "var(--color-danger, #f87171)" }}>
          {loadError}
        </p>
      ) : null}

      <Card className="p-4">
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
            <Receipt
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
              placeholder="Keresés számlák között..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: "36px" }}
            />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table<InvoiceRow>
          data={filtered}
          columns={columns}
          keyField="_id"
          onRowClick={(row) => router.push(`/invoices/${row._id}`)}
          emptyMessage="Nincs megjeleníthető számla"
        />
      </Card>
    </div>
  );
}
