"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@crm/ui";
import { ChevronLeft, Plus, Trash2, Save, FileOutput } from "lucide-react";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";
import type { Contact, StockItemWithProduct } from "@crm/types";

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

interface DeliveryNoteDoc {
  _id: string;
  delivery_number: string;
  contact_id: string;
  project_id: string | null;
  status: "draft" | "issued" | "cancelled";
  issue_date: string;
  lines: Line[];
  notes: string | null;
}

export default function EditDeliveryNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stockItems, setStockItems] = useState<StockItemWithProduct[]>([]);
  const [projects, setProjects] = useState<
    { _id: string; name: string; project_number: string }[]
  >([]);

  const [contactId, setContactId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load contacts, stock, and the delivery note itself
  useEffect(() => {
    Promise.all([
      apiJson<Contact[]>("/api/contacts"),
      apiJson<StockItemWithProduct[]>("/api/warehouse/stock").catch(() => []),
      apiJson<DeliveryNoteDoc>(`/api/delivery-notes/${id}`),
    ])
      .then(([cs, stList, doc]) => {
        setContacts(cs);
        // Only keep those with quantity_in_stock > 0 or already selected in this draft
        const selectedItemIds = new Set(doc.lines.map((l) => l.price_list_item_id));
        setStockItems(
          stList.filter(
            (s) => s.quantity_in_stock > 0 || selectedItemIds.has(s.price_list_item_id),
          ),
        );

        if (doc.status !== "draft") {
          // If not draft, redirect immediately to detail view
          router.replace(`/delivery-notes/${id}`);
          return;
        }

        setContactId(doc.contact_id);
        setProjectId(doc.project_id || "");
        setIssueDate(doc.issue_date.split("T")[0] || "");
        setNotes(doc.notes || "");
        setLines(doc.lines);
        setLoading(false);
      })
      .catch(() => {
        setError("Nem sikerült betölteni a szállítólevelet.");
        setLoading(false);
      });
  }, [id, router]);

  // Dynamically load projects when contact changes
  useEffect(() => {
    if (!contactId) {
      setProjects([]);
      setProjectId("");
      return;
    }
    apiJson<any[]>(`/api/projects?contact_id=${contactId}`)
      .then((res) => {
        setProjects(res);
      })
      .catch(() => {});
  }, [contactId]);

  const updateLine = (idx: number, key: keyof Line, value: string | number) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));

  const selectStockItem = (idx: number, itemId: string) => {
    const sItem = stockItems.find((s) => s.price_list_item_id === itemId);
    if (!sItem) {
      updateLine(idx, "price_list_item_id", itemId);
      return;
    }
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              price_list_item_id: sItem.price_list_item_id,
              name: sItem.product?.name || "",
              unit: sItem.product?.unit || "db",
            }
          : l,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await apiJsonBody(`/api/delivery-notes/${id}`, "PATCH", {
        contact_id: contactId,
        project_id: projectId || null,
        issue_date: issueDate,
        lines,
        notes: notes || null,
      });
      router.push(`/delivery-notes/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Hiba a mentés során.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => router.push(`/delivery-notes/${id}`)}>
          <ChevronLeft size={16} className="mr-1" /> Vissza a részletekhez
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <FileOutput size={22} className="text-[var(--color-accent-primary)]" />
            Szállítólevél szerkesztése (Piszkozat)
          </h1>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-status-error)] bg-[var(--color-status-error)]/10 border border-[var(--color-status-error)]/30 rounded-md px-4 py-2">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Meta */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)] pb-2">
            Alapadatok
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Partner */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dn-contact">Partner *</Label>
              <Select
                value={contactId || "__empty__"}
                onValueChange={(v) => setContactId(v === "__empty__" ? "" : v)}
              >
                <SelectTrigger id="dn-contact" className="w-full">
                  <SelectValue placeholder="Válassz partnert…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">Válassz partnert…</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Issue date */}
            <Input
              type="date"
              label="Kiadás dátuma *"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />

            {/* Project (optional) */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dn-project">Projekt (opcionális)</Label>
              <Select
                value={projectId || "__empty__"}
                onValueChange={(v) => setProjectId(v === "__empty__" ? "" : v)}
                disabled={!contactId}
              >
                <SelectTrigger id="dn-project" className="w-full">
                  <SelectValue
                    placeholder={
                      contactId ? "Válassz projektet…" : "Előbb válassz partnert…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">
                    Válassz projektet (opcionális)…
                  </SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.project_number} – {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <Input
              type="text"
              label="Megjegyzés"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pl. projekt neve, munkaszám…"
            />
          </div>
        </Card>

        {/* Lines */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Tételek
            </h2>
            <Button
              type="button"
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
                className="grid grid-cols-12 gap-4 items-end p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]"
              >
                {/* Product picker */}
                <div className="col-span-5 flex flex-col gap-1.5">
                  <Label>Raktáron lévő termék *</Label>
                  <Select
                    value={line.price_list_item_id || "__empty__"}
                    onValueChange={(v) =>
                      selectStockItem(idx, v === "__empty__" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Válassz terméket…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__empty__">Válassz terméket…</SelectItem>
                      {stockItems.map((s) => (
                        <SelectItem key={s._id} value={s.price_list_item_id}>
                          {s.product?.item_number || "—"} –{" "}
                          {s.product?.name || "Ismeretlen cikk"} (készlet:{" "}
                          {s.quantity_in_stock} {s.product?.unit || "db"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Name (auto-filled, editable) */}
                <div className="col-span-3">
                  <Input
                    type="text"
                    label="Megnevezés"
                    value={line.name}
                    onChange={(e) => updateLine(idx, "name", e.target.value)}
                    placeholder="Termék neve"
                  />
                </div>

                {/* Quantity */}
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0.001"
                    step="1"
                    label="Mennyiség"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(idx, "quantity", parseFloat(e.target.value) || 1)
                    }
                    className="text-right"
                  />
                </div>

                {/* Unit */}
                <div className="col-span-1">
                  <Input
                    type="text"
                    label="Me."
                    value={line.unit}
                    onChange={(e) => updateLine(idx, "unit", e.target.value)}
                  />
                </div>

                {/* Remove */}
                <div className="col-span-1 flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={lines.length === 1}
                    className="p-2 rounded text-[var(--color-status-error)] hover:bg-[var(--color-status-error)]/10 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/delivery-notes/${id}`)}
            disabled={saving}
          >
            Mégse
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            <Save size={15} className="mr-1.5" />
            {saving ? "Mentés…" : "Változtatások mentése"}
          </Button>
        </div>
      </form>
    </div>
  );
}
