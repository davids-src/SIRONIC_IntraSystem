"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button } from "@crm/ui";
import { ChevronLeft, Plus, Trash2, Save, FileOutput } from "lucide-react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import type { Contact, PriceListItem } from "@crm/types";

interface Line {
  price_list_item_id: string;
  name: string;
  quantity: number;
  unit: string;
}

const emptyLine = (): Line => ({
  price_list_item_id: "",
  name: "",
  quantity: 1,
  unit: "db",
});

export default function NewDeliveryNotePage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([]);
  const [contactId, setContactId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiJson<Contact[]>("/api/contacts"),
      apiJson<PriceListItem[]>("/api/price-list"),
    ])
      .then(([cs, pls]) => {
        setContacts(cs);
        setPriceListItems(pls.filter((p) => p.is_active && p.type === "product"));
      })
      .catch(() => {});
  }, []);

  const updateLine = (idx: number, key: keyof Line, value: string | number) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));

  const selectPriceListItem = (idx: number, itemId: string) => {
    const item = priceListItems.find((p) => p._id === itemId);
    if (!item) {
      updateLine(idx, "price_list_item_id", itemId);
      return;
    }
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              price_list_item_id: item._id,
              name: item.name,
              unit: item.unit,
            }
          : l,
      ),
    );
  };

  const handleSubmit = async (status: "draft" | "issued") => {
    if (!contactId) {
      setError("Partner megadása kötelező.");
      return;
    }
    const invalid = lines.some((l) => !l.price_list_item_id || l.quantity <= 0);
    if (invalid) {
      setError(
        "Minden tétel sorban válassz árlistaelemet és adj meg pozitív mennyiséget.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = await apiJsonBody<{ _id: string }>("/api/delivery-notes", "POST", {
        contact_id: contactId,
        project_id: projectId || null,
        issue_date: issueDate,
        status,
        lines,
        notes: notes || null,
      });
      router.push(`/delivery-notes/${data._id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Hiba a mentés során.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push("/delivery-notes")}>
          <ChevronLeft size={16} className="mr-1" /> Vissza
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <FileOutput size={22} className="text-[var(--color-accent-primary)]" />
            Új szállítólevél
          </h1>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-status-error)] bg-[var(--color-status-error)]/10 border border-[var(--color-status-error)]/30 rounded-md px-4 py-2">
          {error}
        </p>
      )}

      {/* Meta */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
          Alapadatok
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Partner */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Partner *
            </label>
            <select
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
            >
              <option value="">Válassz partnert…</option>
              {contacts.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Issue date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Kiadás dátuma *
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
            />
          </div>

          {/* Project id (optional) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Projekt azonosító (opcionális)
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Projekt ObjectId…"
              className="px-3 py-2 text-sm rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Megjegyzés
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pl. projekt neve, munkaszám…"
              className="px-3 py-2 text-sm rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
            />
          </div>
        </div>
      </Card>

      {/* Lines */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Tételek
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <Plus size={14} className="mr-1" /> Sor hozzáadása
          </Button>
        </div>

        <div className="space-y-3">
          {lines.map((line, idx) => (
            <div
              key={idx}
              className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]"
            >
              {/* Product picker */}
              <div className="col-span-5 flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]">
                  Árlistaelem
                </label>
                <select
                  value={line.price_list_item_id}
                  onChange={(e) => selectPriceListItem(idx, e.target.value)}
                  className="px-2 py-1.5 text-sm rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                >
                  <option value="">Válassz terméket…</option>
                  {priceListItems.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.item_number} – {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name (auto-filled, editable) */}
              <div className="col-span-3 flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]">
                  Megnevezés
                </label>
                <input
                  type="text"
                  value={line.name}
                  onChange={(e) => updateLine(idx, "name", e.target.value)}
                  placeholder="Termék neve"
                  className="px-2 py-1.5 text-sm rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                />
              </div>

              {/* Quantity */}
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]">
                  Mennyiség
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="1"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(idx, "quantity", parseFloat(e.target.value) || 1)
                  }
                  className="px-2 py-1.5 text-sm rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] text-right"
                />
              </div>

              {/* Unit */}
              <div className="col-span-1 flex flex-col gap-1">
                <label className="text-xs text-[var(--color-text-muted)]">Me.</label>
                <input
                  type="text"
                  value={line.unit}
                  onChange={(e) => updateLine(idx, "unit", e.target.value)}
                  className="px-2 py-1.5 text-sm rounded border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                />
              </div>

              {/* Remove */}
              <div className="col-span-1 flex items-end justify-center pb-1">
                <button
                  type="button"
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={lines.length === 1}
                  className="p-1.5 rounded text-[var(--color-status-error)] hover:bg-[var(--color-status-error)]/10 disabled:opacity-30 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="secondary"
          onClick={() => void handleSubmit("draft")}
          disabled={saving}
        >
          <Save size={15} className="mr-1.5" />
          {saving ? "Mentés…" : "Mentés piszkozatként"}
        </Button>
        <Button
          variant="primary"
          onClick={() => void handleSubmit("issued")}
          disabled={saving}
        >
          <FileOutput size={15} className="mr-1.5" />
          {saving ? "Mentés…" : "Kiadás & Készletlevonás"}
        </Button>
      </div>
    </div>
  );
}
