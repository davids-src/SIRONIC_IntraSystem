"use client";

import { PageHeader, Card, Button, InputControl, Label } from "@crm/ui";
import { Save, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Supplier } from "@crm/types";

interface Line {
  description: string;
  quantity: number;
  unit: string;
  net_unit_price: number;
  tax_rate: number;
}

const emptyLine = (): Line => ({
  description: "",
  quantity: 1,
  unit: "db",
  net_unit_price: 0,
  tax_rate: 27,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((data: Supplier[]) => {
        setSuppliers(data);
        if (data.length > 0) setSupplierId(data[0]?._id ?? "");
      })
      .catch(() => {});
  }, []);

  const updateLine = (idx: number, key: keyof Line, value: string | number) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));

  const totalNet = lines.reduce((s, l) => s + l.net_unit_price * l.quantity, 0);
  const totalVat = lines.reduce(
    (s, l) => s + l.net_unit_price * l.quantity * (l.tax_rate / 100),
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setError("Válassz ki egy beszállítót!");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId,
          expected_delivery_date: expectedDate || null,
          currency: "HUF",
          lines,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error("Mentés sikertelen.");
      const data = await res.json();
      router.push(`/purchase-orders/${data._id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Új Megrendelőlap"
        subtitle="Új megrendelés összeállítása egy beszállítónak"
        actions={
          <Button variant="ghost" onClick={() => router.push("/purchase-orders")}>
            <ChevronLeft size={16} className="mr-1" /> Vissza
          </Button>
        }
      />

      {error && <div className="text-red-400 p-4 rounded-lg bg-red-950/30">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Fejléc */}
        <Card className="p-6">
          <h3 style={{ fontWeight: 700, marginBottom: "20px" }}>Megrendelés adatai</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <Label htmlFor="supplier">Beszállító *</Label>
              <select
                id="supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border-subtle)",
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text-primary)",
                  fontSize: "14px",
                }}
              >
                <option value="">— Válassz —</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.partner_id})
                  </option>
                ))}
              </select>
              {suppliers.length === 0 && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--color-text-muted)",
                    marginTop: "6px",
                  }}
                >
                  Nincs rögzített beszállító.{" "}
                  <a href="/suppliers/new" style={{ color: "var(--color-accent)" }}>
                    Hozzáadás
                  </a>
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="expected_date">Várható szállítási határidő</Label>
              <InputControl
                id="expected_date"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <Label htmlFor="notes">Megjegyzések</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Pl. Sürgős, express szállítást kérünk..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-border-subtle)",
                background: "var(--color-bg-secondary)",
                color: "var(--color-text-primary)",
                fontSize: "14px",
                resize: "vertical",
              }}
            />
          </div>
        </Card>

        {/* Tételek */}
        <Card className="p-0 overflow-hidden">
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--color-border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ fontWeight: 700 }}>Megrendelt tételek</h3>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              <Plus size={14} className="mr-1" /> Tétel hozzáadása
            </Button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  background: "var(--color-bg-secondary)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                {[
                  "Megnevezés",
                  "Mennyiség",
                  "Egység",
                  "Nettó egységár",
                  "ÁFA %",
                  "Nettó összesen",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr
                  key={idx}
                  style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
                >
                  <td style={{ padding: "8px" }}>
                    <InputControl
                      value={l.description}
                      onChange={(e) => updateLine(idx, "description", e.target.value)}
                      placeholder="Megnevezés"
                      className="h-9 text-sm"
                      required
                    />
                  </td>
                  <td style={{ padding: "8px", width: "90px" }}>
                    <InputControl
                      type="number"
                      min={1}
                      value={String(l.quantity)}
                      onChange={(e) =>
                        updateLine(idx, "quantity", Number(e.target.value))
                      }
                      className="h-9 text-sm"
                    />
                  </td>
                  <td style={{ padding: "8px", width: "80px" }}>
                    <InputControl
                      value={l.unit}
                      onChange={(e) => updateLine(idx, "unit", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </td>
                  <td style={{ padding: "8px", width: "130px" }}>
                    <InputControl
                      type="number"
                      min={0}
                      value={String(l.net_unit_price)}
                      onChange={(e) =>
                        updateLine(idx, "net_unit_price", Number(e.target.value))
                      }
                      className="h-9 text-sm"
                    />
                  </td>
                  <td style={{ padding: "8px", width: "80px" }}>
                    <InputControl
                      type="number"
                      min={0}
                      value={String(l.tax_rate)}
                      onChange={(e) =>
                        updateLine(idx, "tax_rate", Number(e.target.value))
                      }
                      className="h-9 text-sm"
                    />
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontWeight: 600,
                      width: "120px",
                    }}
                  >
                    {fmt(l.net_unit_price * l.quantity)}
                  </td>
                  <td style={{ padding: "8px", width: "40px" }}>
                    {lines.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() =>
                          setLines((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            style={{
              padding: "16px 20px",
              display: "flex",
              justifyContent: "flex-end",
              borderTop: "1px solid var(--color-border-subtle)",
            }}
          >
            <div style={{ minWidth: "220px", fontSize: "13px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                  color: "var(--color-text-muted)",
                }}
              >
                <span>Nettó összesen:</span>
                <span>{fmt(totalNet)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  color: "var(--color-text-muted)",
                }}
              >
                <span>ÁFA:</span>
                <span>{fmt(totalVat)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                  fontSize: "15px",
                }}
              >
                <span>Bruttó összesen:</span>
                <span>{fmt(totalNet + totalVat)}</span>
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <Button
            variant="ghost"
            type="button"
            onClick={() => router.push("/purchase-orders")}
          >
            Mégsem
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            <Save size={15} className="mr-2" />
            {saving ? "Mentés..." : "Megrendelő mentése"}
          </Button>
        </div>
      </form>
    </div>
  );
}
