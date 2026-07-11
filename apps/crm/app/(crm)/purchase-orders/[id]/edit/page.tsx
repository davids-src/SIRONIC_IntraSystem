"use client";

import {
  PageHeader,
  Card,
  Button,
  InputControl,
  Label,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  ItemPickerModal,
} from "@crm/ui";
import { Save, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import type { Supplier, PriceListItem, PurchaseOrder } from "@crm/types";
import { apiJson, apiJsonBody, ApiError } from "@/lib/api-client";

interface Line {
  price_list_item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  net_unit_price: number;
  tax_rate: number;
}

const emptyLine = (): Line => ({
  price_list_item_id: null,
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

export default function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTargetIdx, setPickerTargetIdx] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      apiJson<Supplier[]>("/api/suppliers"),
      apiJson<PriceListItem[]>("/api/price-list"),
      apiJson<PurchaseOrder>(`/api/purchase-orders/${id}`),
    ])
      .then(([sups, priceItems, doc]) => {
        setSuppliers(sups);
        setPriceListItems(priceItems.filter((item) => item.is_active));

        if (doc.status !== "draft") {
          router.replace(`/purchase-orders/${id}`);
          return;
        }

        setSupplierId(doc.supplier_id);
        setExpectedDate(
          doc.expected_delivery_date
            ? new Date(doc.expected_delivery_date).toISOString().slice(0, 10)
            : "",
        );
        setNotes(doc.notes ?? "");
        setLines(
          doc.lines.map((l) => ({
            price_list_item_id: l.price_list_item_id,
            description: l.description,
            quantity: l.quantity,
            unit: l.unit,
            net_unit_price: l.net_unit_price,
            tax_rate: l.tax_rate,
          })),
        );
        setLoading(false);
      })
      .catch(() => {
        setError("Nem sikerült betölteni a megrendelőlap adatait.");
        setLoading(false);
      });
  }, [id, router]);

  const updateLine = (idx: number, key: keyof Line, value: any) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));

  const selectPriceListItem = (idx: number, itemId: string) => {
    if (!itemId) {
      updateLine(idx, "price_list_item_id", null);
      return;
    }
    const item = priceListItems.find((p) => p._id === itemId);
    if (!item) return;

    setLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              price_list_item_id: item._id,
              description: item.name,
              unit: item.unit || "db",
              net_unit_price: item.last_purchase_price || item.net_price || 0,
              tax_rate: item.tax_rate || 27,
            }
          : l,
      ),
    );
  };

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
      await apiJsonBody(`/api/purchase-orders/${id}`, "PATCH", {
        supplier_id: supplierId,
        expected_delivery_date: expectedDate || null,
        notes: notes || null,
        lines,
      });
      router.push(`/purchase-orders/${id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Mentés sikertelen.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-[var(--color-text-muted)]">Betöltés…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Megrendelőlap szerkesztése"
        subtitle="Piszkozat állapotú megrendelés módosítása"
        actions={
          <Button variant="ghost" onClick={() => router.push(`/purchase-orders/${id}`)}>
            <ChevronLeft size={16} className="mr-1" /> Mégse
          </Button>
        }
      />

      {error && <div className="text-red-400 p-4 rounded-lg bg-red-950/30">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Fejléc */}
        <Card className="p-6">
          <h3 style={{ fontWeight: 700, marginBottom: "20px" }}>Megrendelés adatai</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="supplier">Beszállító *</Label>
              <Select
                value={supplierId || "__empty__"}
                onValueChange={(v) => setSupplierId(v === "__empty__" ? "" : v)}
              >
                <SelectTrigger id="supplier" className="w-full">
                  <SelectValue placeholder="— Válassz —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">— Válassz —</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} ({s.partner_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expected_date">Várható szállítási határidő</Label>
              <input
                id="expected_date"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border-subtle)",
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text-primary)",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          <Textarea
            id="notes"
            label="Megjegyzés a beszállítónak"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ide írhatod a megjegyzéseket..."
            rows={3}
          />
        </Card>

        {/* Tételek */}
        <Card className="p-6">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--color-border-subtle)",
              paddingBottom: "12px",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ fontWeight: 700 }}>Tételek</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
            >
              <Plus size={14} className="mr-1" /> Sor hozzáadása
            </Button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {lines.map((line, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2.5fr 2fr 1fr 1fr 1fr 1fr 40px",
                  gap: "12px",
                  alignItems: "end",
                  padding: "12px",
                  borderRadius: "8px",
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <div>
                  <Label style={{ fontSize: "11px" }}>Árlistaelem tallózása</Label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "4px",
                    }}
                  >
                    {line.price_list_item_id ? (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--color-text-secondary)",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {priceListItems.find((p) => p._id === line.price_list_item_id)
                          ?.name ?? "Ismeretlen"}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--color-text-muted)",
                          flex: 1,
                        }}
                      >
                        Szabad szöveg
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setPickerTargetIdx(idx);
                        setShowPicker(true);
                      }}
                    >
                      Tallózás
                    </Button>
                    {line.price_list_item_id && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateLine(idx, "price_list_item_id", null)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <Label style={{ fontSize: "11px" }}>Megnevezés *</Label>
                  <InputControl
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(idx, "description", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label style={{ fontSize: "11px" }}>Mennyiség</Label>
                  <InputControl
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(idx, "quantity", Number(e.target.value) || 1)
                    }
                  />
                </div>

                <div>
                  <Label style={{ fontSize: "11px" }}>Egység</Label>
                  <InputControl
                    type="text"
                    value={line.unit}
                    onChange={(e) => updateLine(idx, "unit", e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label style={{ fontSize: "11px" }}>Nettó egységár (Ft)</Label>
                  <InputControl
                    type="number"
                    value={line.net_unit_price}
                    onChange={(e) =>
                      updateLine(idx, "net_unit_price", Number(e.target.value) || 0)
                    }
                  />
                </div>

                <div>
                  <Label style={{ fontSize: "11px" }}>ÁFA kulcs (%)</Label>
                  <Select
                    value={String(line.tax_rate)}
                    onValueChange={(v) => updateLine(idx, "tax_rate", Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="27">27%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="0">AAM (0%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={lines.length === 1}
                    style={{
                      padding: "8px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#f87171",
                      opacity: lines.length === 1 ? 0.3 : 1,
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid var(--color-border-subtle)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <div style={{ minWidth: "240px", fontSize: "13px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span style={{ color: "var(--color-text-muted)" }}>Nettó összesen:</span>
                <span style={{ fontWeight: 600 }}>{fmt(totalNet)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span style={{ color: "var(--color-text-muted)" }}>ÁFA összesen:</span>
                <span style={{ fontWeight: 600 }}>{fmt(totalVat)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid var(--color-border-subtle)",
                  paddingTop: "8px",
                }}
              >
                <span style={{ fontWeight: 700 }}>Bruttó összesen:</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: "var(--color-accent)",
                    fontSize: "15px",
                  }}
                >
                  {fmt(totalNet + totalVat)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Műveletek */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/purchase-orders/${id}`)}
            disabled={saving}
          >
            Mégse
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            <Save size={15} style={{ marginRight: "6px" }} />
            {saving ? "Mentés..." : "Változtatások mentése"}
          </Button>
        </div>
      </form>

      <ItemPickerModal
        open={showPicker}
        onClose={() => setShowPicker(false)}
        priceList={priceListItems as any[]}
        servicePriceList={[]}
        defaultTab="product"
        onSelectProduct={(p) => {
          if (pickerTargetIdx !== null) {
            selectPriceListItem(pickerTargetIdx, p._id);
          }
        }}
        onSelectService={() => {}}
        title="Árlistaelem kiválasztása"
      />
    </div>
  );
}
