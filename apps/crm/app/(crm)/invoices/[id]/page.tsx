"use client";

import {
  PageHeader,
  Card,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from "@crm/ui";
import type { Contact, Invoice } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

function parseInvoice(raw: unknown): Invoice {
  const inv = raw as Record<string, unknown>;
  return {
    ...(inv as unknown as Invoice),
    issued_at: inv["issued_at"] ? new Date(String(inv["issued_at"])) : null,
    due_at: inv["due_at"] ? new Date(String(inv["due_at"])) : null,
    created_at: new Date(String(inv["created_at"])),
    updated_at: new Date(String(inv["updated_at"])),
  };
}

const statusLabel: Record<Invoice["status"], string> = {
  draft: "Piszkozat",
  sent: "Kiküldve",
  paid: "Fizetve",
  overdue: "Lejárt",
  cancelled: "Törölve",
};

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [contactName, setContactName] = useState("");
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState("HUF");
  const [status, setStatus] = useState<Invoice["status"]>("draft");
  const [issuedAt, setIssuedAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const invRaw = await apiJson<unknown>(`/api/invoices/${id}`, {
          signal: ac.signal,
        });
        const inv = parseInvoice(invRaw);
        setInvoice(inv);
        setTitle(inv.title ?? "");
        setTotalAmount(String(inv.total_amount));
        setCurrency(inv.currency);
        setStatus(inv.status);
        setIssuedAt(inv.issued_at ? inv.issued_at.toISOString().slice(0, 10) : "");
        setDueAt(inv.due_at ? inv.due_at.toISOString().slice(0, 10) : "");

        const contacts = await apiJson<unknown[]>("/api/contacts", { signal: ac.signal });
        const c = contacts.find(
          (row) => String((row as unknown as Contact)._id) === inv.contact_id,
        ) as Contact | undefined;
        setContactName(c?.name ?? inv.contact_id);
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("A számla nem tölthető be.");
      }
    })();
    return () => ac.abort();
  }, [id]);

  const save = async () => {
    if (!invoice) return;
    const total = Number.parseFloat(totalAmount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(total) || total <= 0) {
      setLoadErr("Érvénytelen összeg.");
      return;
    }
    setSaving(true);
    setLoadErr(null);
    try {
      const raw = await apiJsonBody<unknown>(`/api/invoices/${id}`, "PATCH", {
        title: title.trim() || null,
        total_amount: Math.round(total),
        currency,
        status,
        issued_at: issuedAt ? new Date(issuedAt) : null,
        due_at: dueAt ? new Date(dueAt) : null,
      });
      setInvoice(parseInvoice(raw));
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  if (!invoice && !loadErr) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }
  if (loadErr && !invoice) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-[var(--color-status-error)]">{loadErr}</p>
        <Button variant="secondary" onClick={() => router.push("/invoices")}>
          Vissza
        </Button>
      </div>
    );
  }
  if (!invoice) return null;

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <PageHeader
        title={invoice.invoice_number}
        subtitle={contactName}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="default">{statusLabel[status]}</Badge>
            <Button variant="secondary" onClick={() => router.push("/invoices")}>
              Vissza
            </Button>
          </div>
        }
      />
      {loadErr && (
        <p className="text-sm text-[var(--color-status-error)]" role="alert">
          {loadErr}
        </p>
      )}
      <Card className="p-6 space-y-4">
        <Input
          label="Megnevezés"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          label="Összeg"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
        />
        <div className="space-y-2">
          <Label>Pénznem</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HUF">HUF</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Státusz</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Invoice["status"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(statusLabel) as Invoice["status"][]).map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="date"
          label="Kiállítva"
          value={issuedAt}
          onChange={(e) => setIssuedAt(e.target.value)}
        />
        <Input
          type="date"
          label="Esedékes"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
        <Button variant="primary" disabled={saving} onClick={() => void save()}>
          {saving ? "Mentés…" : "Mentés"}
        </Button>
      </Card>
    </div>
  );
}
