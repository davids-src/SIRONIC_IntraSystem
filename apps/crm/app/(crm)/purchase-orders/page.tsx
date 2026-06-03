"use client";

import { PageHeader, Card, Badge, Button, Input } from "@crm/ui";
import { Plus, ShoppingCart, FileDown, Archive, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseOrder, Supplier } from "@crm/types";

const statusVariant: Record<
  string,
  "default" | "info" | "success" | "error" | "warning"
> = {
  draft: "default",
  sent: "info",
  fulfilled: "success",
  cancelled: "error",
};
const statusLabel: Record<string, string> = {
  draft: "Piszkozat",
  sent: "Elküldve",
  fulfilled: "Teljesítve",
  cancelled: "Lemondva",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(n);

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, Supplier>>({});
  const [loading, setLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<PurchaseOrder | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [oRes, sRes] = await Promise.all([
        fetch(`/api/purchase-orders?include_archived=${includeArchived}`),
        fetch("/api/suppliers"),
      ]);
      const oData: PurchaseOrder[] = await oRes.json();
      const sData: Supplier[] = await sRes.json();
      setOrders(oData);
      setSuppliers(Object.fromEntries(sData.map((s) => [s._id, s])));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [includeArchived]);

  const handleArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveTarget) return;
    const res = await fetch(`/api/purchase-orders/${archiveTarget._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_archived: true,
        archived_at: new Date(),
        archive_reason: archiveReason.trim(),
      }),
    });
    if (res.ok) {
      setArchiveTarget(null);
      setArchiveReason("");
      loadData();
    } else alert("Sikertelen archiválás.");
  };

  const handleRestore = async (id: string) => {
    if (!confirm("Vissza szeretnéd állítani ezt a megrendelőlapot?")) return;
    const res = await fetch(`/api/purchase-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_archived: false,
        archived_at: null,
        archive_reason: null,
      }),
    });
    if (res.ok) loadData();
    else alert("Sikertelen visszaállítás.");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Megrendelőlapok"
        subtitle="Beszállítói megrendelések nyomkövetése"
        actions={
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="po-include-archived"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                style={{
                  width: "16px",
                  height: "16px",
                  cursor: "pointer",
                  accentColor: "var(--color-accent-primary)",
                }}
              />
              <label
                htmlFor="po-include-archived"
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Archivált elemek
              </label>
            </div>
            <Button variant="primary" onClick={() => router.push("/purchase-orders/new")}>
              <Plus size={16} className="mr-2" /> Új megrendelő
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="p-8 text-center text-gray-400">Betöltés...</div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-gray-400">Még nincs egyetlen megrendelőlap sem.</p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => router.push("/purchase-orders/new")}
          >
            <Plus size={16} className="mr-2" /> Első megrendelőlap
          </Button>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--color-border-subtle)",
                  background: "var(--color-bg-secondary)",
                }}
              >
                {[
                  "Sorszám",
                  "Beszállító",
                  "Várható szállítás",
                  "Összeg",
                  "Állapot",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
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
              {orders.map((o) => {
                const supplier = suppliers[o.supplier_id];
                return (
                  <tr
                    key={o._id}
                    style={{
                      borderBottom: "1px solid var(--color-border-subtle)",
                      cursor: "pointer",
                    }}
                    onClick={() => router.push(`/purchase-orders/${o._id}`)}
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontFamily: "monospace",
                        fontWeight: 600,
                      }}
                    >
                      {o.order_number}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600 }}>
                        {supplier?.name ?? "Ismeretlen"}
                      </div>
                      {supplier?.partner_id && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--color-text-muted)",
                            fontFamily: "monospace",
                          }}
                        >
                          {supplier.partner_id}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {o.expected_delivery_date
                        ? new Date(o.expected_delivery_date).toLocaleDateString("hu-HU")
                        : "—"}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                      {fmt(o.total_amount)}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <Badge variant={statusVariant[o.status]}>
                        {statusLabel[o.status]}
                      </Badge>
                    </td>
                    <td
                      style={{ padding: "14px 16px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/purchase-orders/${o._id}`)}
                        >
                          <FileDown size={14} />
                        </Button>
                        {o.is_archived ? (
                          <button
                            onClick={() => handleRestore(o._id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--color-text-secondary)",
                              padding: "4px",
                              borderRadius: "6px",
                            }}
                            title="Visszaállítás"
                          >
                            <RotateCcw size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setArchiveTarget(o);
                              setArchiveReason("");
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--color-status-error, #f87171)",
                              padding: "4px",
                              borderRadius: "6px",
                            }}
                            title="Archiválás"
                          >
                            <Archive size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {archiveTarget && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setArchiveTarget(null)}
        >
          <div
            className="rounded-xl border p-6"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              width: "100%",
              maxWidth: "450px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 12px 0", color: "#fff" }}>
              Megrendelőlap archiválása
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-muted)",
                marginBottom: "16px",
              }}
            >
              Biztosan archiválni szeretnéd: <strong>{archiveTarget.order_number}</strong>
              ?<br />
              Kérjük, add meg az archiválás indokát.
            </p>
            <form
              onSubmit={handleArchive}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                  Archiválás oka *
                </label>
                <Input
                  id="po-archive-reason"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Pl. Lemondva, elavult..."
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setArchiveTarget(null)}
                >
                  Mégse
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  style={{
                    backgroundColor: "var(--color-status-error, #f87171)",
                    borderColor: "var(--color-status-error, #f87171)",
                  }}
                >
                  Archiválás
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
