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
} from "@crm/ui";
import type { Contact } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NewInvoicePage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState("");
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState("HUF");
  const [issuedAt, setIssuedAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const raw = await apiJson<unknown[]>("/api/contacts", { signal: ac.signal });
        setContacts(
          raw.map((r) => {
            const x = r as Record<string, unknown>;
            return {
              ...(x as unknown as Contact),
              created_at: new Date(String(x.created_at)),
              updated_at: new Date(String(x.updated_at)),
            };
          }),
        );
        setLoadErr(null);
      } catch {
        if (!ac.signal.aborted) setLoadErr("Ügyfelek betöltése sikertelen.");
      }
    })();
    return () => ac.abort();
  }, []);

  const submit = async () => {
    if (!contactId.trim()) {
      setLoadErr("Válassz ügyfelet.");
      return;
    }
    const total = Number.parseFloat(totalAmount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(total) || total <= 0) {
      setLoadErr("Adj meg érvényes összeget.");
      return;
    }
    setSaving(true);
    setLoadErr(null);
    try {
      const created = await apiJsonBody<Record<string, unknown>>(
        "/api/invoices",
        "POST",
        {
          contact_id: contactId,
          title: title.trim() || null,
          total_amount: Math.round(total),
          currency,
          status: "draft",
          issued_at: issuedAt ? new Date(issuedAt) : null,
          due_at: dueAt ? new Date(dueAt) : null,
        },
      );
      const id = String(created._id);
      router.push(`/invoices/${id}`);
    } catch (e) {
      setLoadErr(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <PageHeader
        title="Új számla"
        subtitle="Egyszerű fejléc — tételek később bővíthetők"
        actions={
          <Button variant="secondary" onClick={() => router.push("/invoices")}>
            Vissza
          </Button>
        }
      />
      {loadErr && (
        <p className="text-sm text-[var(--color-status-error)]" role="alert">
          {loadErr}
        </p>
      )}
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label>Ügyfél *</Label>
          <Select value={contactId || undefined} onValueChange={setContactId}>
            <SelectTrigger>
              <SelectValue placeholder="Válassz ügyfelet" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          label="Megnevezés (opcionális)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          label="Bruttó / összeg *"
          type="text"
          inputMode="decimal"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="pl. 125000"
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
        <Input
          label="Kiállítás dátuma (opcionális)"
          type="date"
          value={issuedAt}
          onChange={(e) => setIssuedAt(e.target.value)}
        />
        <Input
          label="Esedékesség (opcionális)"
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
        />
        <Button variant="primary" disabled={saving} onClick={() => void submit()}>
          {saving ? "Mentés…" : "Számla létrehozása"}
        </Button>
      </Card>
    </div>
  );
}
