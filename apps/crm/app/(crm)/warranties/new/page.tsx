"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button } from "@crm/ui";
import { ChevronLeft, Plus, Trash2, Save, ShieldCheck } from "lucide-react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import type { Contact, PriceListItem } from "@crm/types";

interface WarrantyLine {
  price_list_item_id: string;
  name: string;
  serial_number: string;
  warranty_years: number;
  warranty_start: string;
  warranty_end: string; // auto-számolt
}

const today = () => new Date().toISOString().split("T")[0] ?? "";

function calcEnd(start: string, years: number): string {
  if (!start) return "";
  try {
    const d = new Date(start);
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().split("T")[0] ?? "";
  } catch {
    return "";
  }
}

function fmtDate(iso: string) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("hu-HU").format(new Date(iso));
  } catch {
    return iso;
  }
}

const emptyLine = (): WarrantyLine => ({
  price_list_item_id: "",
  name: "",
  serial_number: "",
  warranty_years: 2,
  warranty_start: today(),
  warranty_end: calcEnd(today(), 2),
});

export default function NewWarrantyPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([]);
  const [contactId, setContactId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<WarrantyLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiJson<Contact[]>("/api/contacts"),
      apiJson<PriceListItem[]>("/api/price-list"),
    ])
      .then(([cs, pls]) => {
        setContacts(cs);
        // Csak fizikai termékek
        setPriceListItems(pls.filter((p) => p.is_active && p.type === "product"));
      })
      .catch(() => {});
  }, []);

  const updateLine = <K extends keyof WarrantyLine>(
    idx: number,
    key: K,
    value: WarrantyLine[K],
  ) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [key]: value };
        // Ha dátum vagy évszám változott, újraszámoljuk a lejáratot
        if (key === "warranty_start" || key === "warranty_years") {
          updated.warranty_end = calcEnd(
            key === "warranty_start" ? (value as string) : updated.warranty_start,
            key === "warranty_years" ? (value as number) : updated.warranty_years,
          );
        }
        return updated;
      }),
    );
  };

  const selectPriceListItem = (idx: number, itemId: string) => {
    const item = priceListItems.find((p) => p._id === itemId);
    if (!item) {
      updateLine(idx, "price_list_item_id", itemId);
      return;
    }
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx ? { ...l, price_list_item_id: item._id, name: item.name } : l,
      ),
    );
  };

  const handleSubmit = async () => {
    if (!contactId) {
      setError("Partner megadása kötelező.");
      return;
    }
    const invalid = lines.some((l) => !l.name.trim() || l.warranty_years < 1);
    if (invalid) {
      setError("Minden tétel sorban add meg a termék nevét és a jótállás idejét.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = await apiJsonBody<{ _id: string }>("/api/warranties", "POST", {
        contact_id: contactId,
        invoice_number: invoiceNumber.trim() || null,
        issue_date: issueDate,
        lines: lines.map((l) => ({
          price_list_item_id: l.price_list_item_id || null,
          name: l.name.trim(),
          serial_number: l.serial_number.trim() || null,
          warranty_years: l.warranty_years,
          warranty_start: l.warranty_start,
          warranty_end: l.warranty_end,
        })),
        notes: notes.trim() || null,
        status: "active",
      });
      router.push(`/warranties/${data._id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Hiba a mentés során.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "px-3 py-2 text-sm rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)] w-full";

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push("/warranties")}>
          <ChevronLeft size={16} className="mr-1" /> Vissza
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <ShieldCheck size={22} className="text-[var(--color-accent-primary)]" />
            Új jótállási jegy
          </h1>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-status-error)] bg-[var(--color-status-error)]/10 border border-[var(--color-status-error)]/30 rounded-md px-4 py-2">
          {error}
        </p>
      )}

      {/* Fejléc adatok */}
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
              className={inputCls}
            >
              <option value="">Válassz partnert…</option>
              {contacts.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kiállítás dátuma */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Kiállítás dátuma *
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Számla sorszáma */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Számla sorszáma (opcionális)
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Pl. SZ-2025-0042"
              className={inputCls}
            />
          </div>

          {/* Megjegyzés */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">
              Megjegyzés (opcionális)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Belső megjegyzés…"
              className={inputCls}
            />
          </div>
        </div>
      </Card>

      {/* Tételek */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Jótállási tételek
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <Plus size={14} className="mr-1" /> Sor hozzáadása
          </Button>
        </div>

        <div className="space-y-4">
          {lines.map((line, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  {idx + 1}. tétel
                </span>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 rounded text-[var(--color-status-error)] hover:bg-[var(--color-status-error)]/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Sor 1: Árlista tétel + Termék neve */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)]">
                    Árlistaelem (opcionális)
                  </label>
                  <select
                    value={line.price_list_item_id}
                    onChange={(e) => selectPriceListItem(idx, e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— Válassz termékből, vagy írd be kézzel —</option>
                    {priceListItems.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.item_number} – {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)]">
                    Termék neve *
                  </label>
                  <input
                    type="text"
                    value={line.name}
                    onChange={(e) => updateLine(idx, "name", e.target.value)}
                    placeholder="Pl. Hikvision DS-2CD2183G2-I kamera"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Sor 2: Gyártási szám + Jótállás évei + Kezdete + Lejárat */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)]">
                    Gyártási szám
                  </label>
                  <input
                    type="text"
                    value={line.serial_number}
                    onChange={(e) => updateLine(idx, "serial_number", e.target.value)}
                    placeholder="SN123456"
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)]">
                    Jótállás (év) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={line.warranty_years}
                    onChange={(e) =>
                      updateLine(
                        idx,
                        "warranty_years",
                        Math.max(1, parseInt(e.target.value) || 1),
                      )
                    }
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)]">
                    Jótállás kezdete *
                  </label>
                  <input
                    type="date"
                    value={line.warranty_start}
                    onChange={(e) => updateLine(idx, "warranty_start", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--color-text-muted)]">
                    Lejárat (auto)
                  </label>
                  <div className="px-3 py-2 text-sm rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)] text-[var(--color-accent-primary)] font-medium">
                    {line.warranty_end ? fmtDate(line.warranty_end) : "—"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Műveletek */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          onClick={() => router.push("/warranties")}
          disabled={saving}
        >
          Mégse
        </Button>
        <Button variant="primary" onClick={() => void handleSubmit()} disabled={saving}>
          <Save size={15} className="mr-1.5" />
          {saving ? "Mentés…" : "Jótállási jegy kiállítása"}
        </Button>
      </div>
    </div>
  );
}
